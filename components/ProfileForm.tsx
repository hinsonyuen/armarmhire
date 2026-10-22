"use client";

import { useEffect, useRef, useState } from "react";
import { initials } from "@/lib/initials";

type Attachment = { name: string; url: string; size: number };

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProfileForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");

  // Existing (already-saved) profile picture URL, vs. a newly-picked file
  // this session that hasn't been uploaded yet.
  const [existingPictureUrl, setExistingPictureUrl] = useState<string | null>(null);
  const [newPictureFile, setNewPictureFile] = useState<File | null>(null);
  const [newPicturePreview, setNewPicturePreview] = useState<string | null>(null);

  // Existing (already-saved) attachments, vs. new files picked this
  // session that haven't been uploaded yet.
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [newAttachmentFiles, setNewAttachmentFiles] = useState<File[]>([]);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (cancelled) return;
        const p = data.profile;
        if (p) {
          setName(p.companyName ?? "");
          setLocation(p.location ?? "");
          setEmail(p.email ?? "");
          setPhone(p.phone ?? "");
          setLinkedin(p.linkedin ?? "");
          setExistingPictureUrl(p.profilePictureUrl ?? null);
          setExistingAttachments(Array.isArray(p.attachments) ? p.attachments : []);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewPictureFile(file);
    setNewPicturePreview(URL.createObjectURL(file));
  }

  function handleAttachmentsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    setNewAttachmentFiles((prev) => [...prev, ...Array.from(files)]);
    e.target.value = "";
  }

  function removeExistingAttachment(url: string) {
    setExistingAttachments((prev) => prev.filter((a) => a.url !== url));
  }

  function removeNewAttachment(index: number) {
    setNewAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const form = new FormData();
      form.set("companyName", name);
      form.set("location", location);
      form.set("email", email);
      form.set("phone", phone);
      form.set("linkedin", linkedin);
      form.set("keepAttachments", JSON.stringify(existingAttachments));
      for (const file of newAttachmentFiles) {
        form.append("newAttachments", file);
      }
      if (newPictureFile) {
        form.set("profilePicture", newPictureFile);
      }

      const res = await fetch("/api/profile", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setSaveError(
          data?.error
            ? `${data.error}${data.detail ? `: ${data.detail}` : ""}`
            : "Save failed."
        );
        return;
      }

      const p = data.profile;
      setExistingPictureUrl(p.profilePictureUrl ?? null);
      setExistingAttachments(Array.isArray(p.attachments) ? p.attachments : []);
      setNewPictureFile(null);
      setNewPicturePreview(null);
      setNewAttachmentFiles([]);
      setSaveMessage("Saved.");
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err) {
      console.error("Save threw:", err);
      setSaveError("Couldn't reach the server — check your connection.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-text-muted shadow-card">
        Loading profile…
      </div>
    );
  }

  const displayedPicture = newPicturePreview ?? existingPictureUrl;

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Profile picture */}
      <section className="flex items-center gap-5 rounded-xl border border-border bg-card p-6 shadow-card">
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          className="group relative h-20 w-20 flex-none overflow-hidden rounded-full border border-border bg-brand-light"
        >
          {displayedPicture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayedPicture}
              alt="Profile picture preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-brand-ink">
              {name.trim() ? initials(name) : "E"}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            Change
          </span>
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <div>
          <p className="text-sm font-semibold text-text">Profile picture</p>
          <p className="text-xs text-text-muted">
            Click the circle to upload a logo or photo. PNG or JPG.
          </p>
        </div>
      </section>

      {/* Core details */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
        <Field label="Company name / Name" htmlFor="name" required>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. MTR Corporation"
            className="input"
          />
        </Field>

        <Field label="Location" htmlFor="location" required>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            placeholder="e.g. Hong Kong"
            className="input"
          />
        </Field>

        <Field label="Email" htmlFor="email" required>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="e.g. hiring@company.com"
            className="input"
          />
        </Field>

        <Field label="Phone number" htmlFor="phone" optional>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +852 1234 5678"
            className="input"
          />
        </Field>

        <Field label="LinkedIn" htmlFor="linkedin" optional>
          <input
            id="linkedin"
            type="url"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://www.linkedin.com/company/…"
            className="input"
          />
        </Field>
      </section>

      {/* Attachments */}
      <section className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-text">
              Attachments <span className="font-normal text-text-faint">(optional)</span>
            </p>
            <p className="text-xs text-text-muted">
              Documents or photos that improve your credibility as an employer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => attachmentInputRef.current?.click()}
            className="flex-none rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface"
          >
            Add files
          </button>
          <input
            ref={attachmentInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleAttachmentsChange}
          />
        </div>

        {(existingAttachments.length > 0 || newAttachmentFiles.length > 0) && (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {existingAttachments.map((a) => (
              <li
                key={a.url}
                className="flex items-center justify-between gap-3 bg-surface px-4 py-2.5"
              >
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 truncate text-sm text-text hover:text-brand-dark hover:underline"
                >
                  {a.name}
                </a>
                <span className="flex-none text-xs text-text-faint">
                  {formatSize(a.size)}
                </span>
                <button
                  type="button"
                  onClick={() => removeExistingAttachment(a.url)}
                  className="flex-none text-xs font-semibold text-brand-ink hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
            {newAttachmentFiles.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center justify-between gap-3 bg-brand-light px-4 py-2.5"
              >
                <span className="min-w-0 truncate text-sm text-text">
                  {f.name}
                </span>
                <span className="flex-none text-xs text-text-faint">
                  {formatSize(f.size)} · not saved yet
                </span>
                <button
                  type="button"
                  onClick={() => removeNewAttachment(i)}
                  className="flex-none text-xs font-semibold text-brand-ink hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Email format — not built yet */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-text">Email format</p>
            <p className="text-xs text-text-muted">
              Configure how outgoing emails to candidates are formatted.
            </p>
          </div>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="flex-none rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-faint"
            aria-disabled="true"
          >
            Coming soon
          </a>
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saveMessage && (
          <p className="text-sm text-text-muted">{saveMessage}</p>
        )}
        {saveError && (
          <p className="text-sm text-red-700">{saveError}</p>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  optional,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-text">
        {label}
        {optional && (
          <span className="ml-1 font-normal text-text-faint">(optional)</span>
        )}
        {required && <span className="ml-1 text-brand">*</span>}
      </label>
      {children}
    </div>
  );
}
