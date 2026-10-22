import nodemailer from "nodemailer";

// Outgoing email. Configure with SMTP_* in .env. For local development,
// docker-compose.yml runs Mailpit, which accepts any mail on port 1025
// and shows it at http://localhost:8025 — nothing is actually delivered.
// If SMTP_HOST isn't set at all, the email is printed to the dev server
// console instead so sign-up still works.

type Mail = { to: string; subject: string; text: string; html: string };

function transport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export async function sendMail(mail: Mail) {
  const from = process.env.EMAIL_FROM || "ArmArmHire <no-reply@armarmhire.local>";
  const t = transport();
  if (!t) {
    console.log(
      `\n[email] SMTP_HOST not set; printing instead of sending.\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n`
    );
    return;
  }
  await t.sendMail({ from, ...mail });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function layout(heading: string, body: string, buttonText: string, url: string) {
  const safeUrl = escapeHtml(url);
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
  <div style="display:inline-block;background:#111;color:#fff;font-weight:800;padding:4px 12px;font-size:18px">ArmArmHire</div>
  <h1 style="font-size:20px;margin:24px 0 8px">${heading}</h1>
  <p style="font-size:14px;line-height:1.5;color:#444">${body}</p>
  <p style="margin:24px 0"><a href="${safeUrl}" style="background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">${buttonText}</a></p>
  <p style="font-size:12px;color:#888">Or paste this link into your browser:<br>${safeUrl}</p>
</div>`;
}

export async function sendVerificationEmail(to: string, url: string, hours: number) {
  await sendMail({
    to,
    subject: "Confirm your email for ArmArmHire",
    text: `Confirm your email to finish creating your ArmArmHire recruiter account:\n\n${url}\n\nThis link expires in ${hours} hours. If you didn't sign up, you can ignore this email.`,
    html: layout(
      "Confirm your email",
      `Click below to confirm your email and create your password. This link expires in ${hours} hours. If you didn't sign up, you can ignore this email.`,
      "Confirm email",
      url
    ),
  });
}

export async function sendAlreadyRegisteredEmail(to: string, loginUrl: string) {
  await sendMail({
    to,
    subject: "You already have an ArmArmHire account",
    text: `Someone (hopefully you) tried to sign up with this email, but it already has an ArmArmHire account. Log in here:\n\n${loginUrl}\n\nIf this wasn't you, you can ignore this email.`,
    html: layout(
      "You already have an account",
      "Someone (hopefully you) tried to sign up with this email, but it already has an ArmArmHire account. If this wasn't you, you can ignore this email.",
      "Log in",
      loginUrl
    ),
  });
}
