"""
Predict an industry for every candidate with the trained ArmArmHire industry
classifier (the folder downloaded from the v3 Colab notebook), and write the
results where the seed script picks them up.

Usage (from the project root):
    pip install -r ml/requirements.txt
    python ml/classify_candidates.py --model-dir path/to/armarmhire-industry-classifier
    npm run prisma:seed

Inputs
    --model-dir   the unzipped model folder (config.json, model.safetensors,
                  tokenizer*.json, tfidf_model.joblib, ensemble_config.json,
                  scores_*.{csv,json})
    --candidates  prisma/data/candidates.json (default) — same file the seed reads

Outputs
    prisma/data/candidate-industries.json   one row per candidate:
        {"idx", "industry", "probability", "confident", "top3": [{"industry","probability"}, ...]}
    lib/industry-model-scores.json          the model's validation scores per industry
                                            (shown next to the role search in the app)

Runs on CPU; a few hundred candidates take a minute or two.
"""
import argparse
import csv
import json
import os
import re
import sys
import warnings

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def clean(text):
    return re.sub(r"\s+", " ", str(text) if text is not None else "").strip()


def candidate_text(c):
    """Turn a structured candidate record into resume-like text.

    The model was trained on full resumes, so this mirrors that layout:
    skills, then each job (title, employer, dates, description), then
    education. Name, email and LinkedIn are left out on purpose: they say
    nothing about industry.
    """
    parts = []
    skills = [s for s in (c.get("skills") or []) if s]
    if skills:
        parts.append("SKILLS " + ", ".join(skills))
    jobs = [e for e in (c.get("experiences") or []) if any(e.get(k) for k in ("positionTitle", "employer", "description"))]
    if jobs:
        parts.append("EXPERIENCE")
        for e in jobs:
            head = " ".join(x for x in [e.get("positionTitle"), "at" if e.get("employer") else None,
                                        e.get("employer"), e.get("timePeriod"), e.get("location")] if x)
            parts.append(head)
            if e.get("description"):
                parts.append(e["description"])
    edu = [c.get("degreeType"), c.get("institution"), c.get("educationTimePeriod"), c.get("educationDescription")]
    if any(edu):
        parts.append("EDUCATION " + " ".join(x for x in edu if x))
    return clean(" ".join(parts))


def resolve_model_dir(model_dir):
    """Accept the folder itself, or a parent that contains it (zip tools often nest one level)."""
    model_dir = os.path.abspath(model_dir)
    if os.path.isfile(os.path.join(model_dir, "ensemble_config.json")):
        return model_dir
    if os.path.isdir(model_dir):
        for root, _dirs, files in os.walk(model_dir, followlinks=True):
            if "ensemble_config.json" in files and root.count(os.sep) - model_dir.count(os.sep) <= 2:
                return root
        found = ", ".join(sorted(os.listdir(model_dir))[:12]) or "(empty)"
        sys.exit(f"No ensemble_config.json in {model_dir}. It contains: {found}\n"
                 "Point --model-dir at the unzipped armarmhire-industry-classifier folder "
                 "(the one with model.safetensors and tfidf_model.joblib).")
    sys.exit(f"Model folder not found: {model_dir}\n"
             "Unzip armarmhire-industry-classifier.zip there, or pass its real location with --model-dir.")


def load_model(model_dir):
    import joblib
    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    with open(os.path.join(model_dir, "ensemble_config.json")) as f:
        cfg = json.load(f)
    id2label = {int(k): v for k, v in cfg["id2label"].items()}

    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    model = AutoModelForSequenceClassification.from_pretrained(model_dir).eval()
    tfidf, tfidf_cols = None, None
    try:
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            tfidf = joblib.load(os.path.join(model_dir, "tfidf_model.joblib"))
        if any("InconsistentVersionWarning" in type(w.message).__name__ for w in caught):
            print("⚠ tfidf_model.joblib was saved with a different scikit-learn version. If predictions look "
                  "wrong, install the version Colab used (run `!pip show scikit-learn` there).", file=sys.stderr)
        # The TF-IDF classifier's columns follow its own class order; align them to id2label.
        tfidf_cols = [list(tfidf.classes_).index(i) for i in range(len(id2label))]
    except Exception as e:  # typically a scikit-learn version mismatch
        print(f"⚠ Could not load tfidf_model.joblib ({type(e).__name__}: {e}).\n"
              "  Continuing with the transformer alone — predictions will be slightly less accurate.\n"
              "  To use the full ensemble, install the scikit-learn version Colab used "
              "(`!pip show scikit-learn` in Colab).", file=sys.stderr)
        tfidf = None
    return cfg, id2label, tokenizer, model, tfidf, tfidf_cols, torch


def predict(texts, cfg, tokenizer, model, tfidf, tfidf_cols, torch, batch_size=16):
    w = float(cfg["ensemble_weight"])
    p_tf = []
    with torch.no_grad():
        for i in range(0, len(texts), batch_size):
            enc = tokenizer(texts[i:i + batch_size], truncation=True, max_length=int(cfg["max_len"]),
                            padding=True, return_tensors="pt")
            p_tf.append(torch.softmax(model(**enc).logits.float(), -1).numpy())
    p_tf = np.concatenate(p_tf) if p_tf else np.zeros((0, len(tfidf_cols)))
    if tfidf is None:
        return p_tf
    p_tfidf = tfidf.predict_proba(texts)[:, tfidf_cols]
    return w * p_tf + (1 - w) * p_tfidf


def export_scores(model_dir, out_path):
    per = os.path.join(model_dir, "scores_per_industry.csv")
    if not os.path.exists(per):
        return False
    with open(per, newline="") as f:
        rows = list(csv.DictReader(f))
    num = lambda v: None if v in (None, "", "nan") else round(float(v), 4)
    scores = {"perIndustry": {r["industry"]: {
        "resumes": int(float(r["resumes"])),
        "top1Accuracy": num(r.get("top1_accuracy")),
        "top3Accuracy": num(r.get("top3_accuracy")),
        "confidentAccuracy": num(r.get("confident_accuracy")),
    } for r in rows}}
    master = os.path.join(model_dir, "scores_master.json")
    if os.path.exists(master):
        with open(master) as f:
            m = json.load(f)
        scores["master"] = {"top3Accuracy": m.get("MASTER_SCORE_top3_accuracy"),
                            "top1Accuracy": m.get("top1_accuracy")}
    with open(out_path, "w") as f:
        json.dump(scores, f, indent=1)
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--model-dir", required=True)
    ap.add_argument("--candidates", default=os.path.join(ROOT, "prisma", "data", "candidates.json"))
    ap.add_argument("--out", default=os.path.join(ROOT, "prisma", "data", "candidate-industries.json"))
    ap.add_argument("--scores-out", default=os.path.join(ROOT, "lib", "industry-model-scores.json"))
    args = ap.parse_args()

    with open(args.candidates) as f:
        candidates = json.load(f)
    print(f"Loaded {len(candidates)} candidates from {args.candidates}")
    args.model_dir = resolve_model_dir(args.model_dir)
    print(f"Using model in {args.model_dir}")

    if not candidates:
        with open(args.out, "w") as f:
            json.dump([], f)
        if export_scores(args.model_dir, args.scores_out):
            print(f"Wrote model scores to {args.scores_out}")
        print("candidates.json is empty, so there is nothing to classify yet. Add candidate data, "
              "then run this script again before seeding.")
        return

    cfg, id2label, tokenizer, model, tfidf, tfidf_cols, torch = load_model(args.model_dir)
    threshold = float(cfg.get("confident_threshold", 1.0))

    texts = [candidate_text(c) for c in candidates]
    results = []
    if candidates:
        probs = predict(texts, cfg, tokenizer, model, tfidf, tfidf_cols, torch)
        for c, text, p in zip(candidates, texts, probs):
            if not text:          # nothing to classify on
                continue
            top = np.argsort(-p)[:3]
            results.append({
                "idx": c["idx"],
                "industry": id2label[int(top[0])],
                "probability": round(float(p[top[0]]), 4),
                "confident": bool(p[top[0]] >= threshold),
                "top3": [{"industry": id2label[int(i)], "probability": round(float(p[i]), 4)} for i in top],
            })

    with open(args.out, "w") as f:
        json.dump(results, f, indent=1)
    print(f"Wrote {len(results)} predictions to {args.out}")
    if results:
        from collections import Counter
        print("Top industries:", Counter(r["industry"] for r in results).most_common(8))
        print(f"Confident (auto-accepted): {sum(r['confident'] for r in results)} of {len(results)}")
    if export_scores(args.model_dir, args.scores_out):
        print(f"Wrote model scores to {args.scores_out}")


if __name__ == "__main__":
    main()
