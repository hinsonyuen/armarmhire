import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Attachment = { name: string; url: string; size: number };

// This app has no login/session system, so there's only ever one
// employer profile — always the first (and only) row, not looked up
// by any per-user key.
async function getSingleton() {
  return prisma.employerProfile.findFirst({ orderBy: { createdAt: "asc" } });
}

export async function GET() {
  try {
    const profile = await getSingleton();
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("profile GET error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Internal error fetching profile", detail: message },
      { status: 500 }
    );
  }
}

async function saveUploadedFile(file: File): Promise<Attachment> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const ext = path.extname(file.name);
  const filename = `${randomUUID()}${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), bytes);

  return { name: file.name, url: `/uploads/${filename}`, size: file.size };
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const companyName = (form.get("companyName") as string) || null;
    const location = (form.get("location") as string) || null;
    const email = (form.get("email") as string) || null;
    const phone = (form.get("phone") as string) || null;
    const linkedin = (form.get("linkedin") as string) || null;

    const keepAttachmentsRaw = form.get("keepAttachments") as string | null;
    const keepAttachments: Attachment[] = keepAttachmentsRaw
      ? JSON.parse(keepAttachmentsRaw)
      : [];

    const newAttachmentFiles = form
      .getAll("newAttachments")
      .filter((v): v is File => v instanceof File && v.size > 0);
    const newAttachments = await Promise.all(
      newAttachmentFiles.map(saveUploadedFile)
    );

    const attachments = [...keepAttachments, ...newAttachments];

    const profilePictureFile = form.get("profilePicture");
    const clearProfilePicture = form.get("clearProfilePicture") === "true";

    const existing = await getSingleton();

    let profilePictureUrl = existing?.profilePictureUrl ?? null;
    if (clearProfilePicture) {
      profilePictureUrl = null;
    } else if (profilePictureFile instanceof File && profilePictureFile.size > 0) {
      const saved = await saveUploadedFile(profilePictureFile);
      profilePictureUrl = saved.url;
    }

    const data = {
      companyName,
      location,
      email,
      phone,
      linkedin,
      profilePictureUrl,
      attachments,
    };

    const profile = existing
      ? await prisma.employerProfile.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.employerProfile.create({ data });

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("profile POST error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Internal error saving profile", detail: message },
      { status: 500 }
    );
  }
}
