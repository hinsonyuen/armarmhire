import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { roles } from "@/lib/roles";
import { countries } from "@/lib/countriesList";
import {
  COMPANY_SIZES,
  HIRING_TIMELINES,
  INDUSTRIES,
  OPEN_POSITIONS,
  RECRUITER_TYPES,
} from "@/lib/recruiterOptions";

export const dynamic = "force-dynamic";

const roleNames = new Set(roles.map((r) => r.name));

function str(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function optional(v: unknown, max = 200): string | null {
  return str(v, max) || null;
}

function strList(v: unknown, max = 50): string[] {
  if (!Array.isArray(v)) return [];
  return Array.from(new Set(v.map((x) => str(x)).filter(Boolean))).slice(0, max);
}

// Saves the recruiter profile form shown right after sign-up, and marks
// the account as onboarded. Can be resubmitted (it upserts).
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const b = await req.json().catch(() => ({}));
    const data = {
      firstName: str(b.firstName, 100),
      lastName: str(b.lastName, 100),
      jobTitle: str(b.jobTitle, 150),
      phone: optional(b.phone, 40),
      linkedin: optional(b.linkedin, 300),
      recruiterType: str(b.recruiterType),
      agencyName: optional(b.agencyName),
      companyName: str(b.companyName),
      companyWebsite: optional(b.companyWebsite, 300),
      companyIndustry: str(b.companyIndustry),
      companySize: str(b.companySize),
      companyCountry: str(b.companyCountry),
      companyCity: optional(b.companyCity),
      hiringRoles: strList(b.hiringRoles).filter((r) => roleNames.has(r)),
      hiringLocations: strList(b.hiringLocations, 20),
      openPositions: optional(b.openPositions),
      hiringTimeline: optional(b.hiringTimeline),
    };

    const errors: Record<string, string> = {};
    if (!data.firstName) errors.firstName = "Required";
    if (!data.lastName) errors.lastName = "Required";
    if (!data.jobTitle) errors.jobTitle = "Required";
    if (!RECRUITER_TYPES.some((t) => t.value === data.recruiterType)) {
      errors.recruiterType = "Choose one";
    }
    if (data.recruiterType === "agency" && !data.agencyName) errors.agencyName = "Required";
    if (data.recruiterType !== "agency") data.agencyName = null;
    if (!data.companyName) errors.companyName = "Required";
    if (!INDUSTRIES.includes(data.companyIndustry)) errors.companyIndustry = "Choose one";
    if (!COMPANY_SIZES.includes(data.companySize)) errors.companySize = "Choose one";
    if (!countries.includes(data.companyCountry)) errors.companyCountry = "Choose a country";
    if (data.hiringRoles.length === 0) errors.hiringRoles = "Pick at least one role";
    if (data.openPositions && !OPEN_POSITIONS.includes(data.openPositions)) {
      errors.openPositions = "Choose one";
    }
    if (data.hiringTimeline && !HIRING_TIMELINES.includes(data.hiringTimeline)) {
      errors.hiringTimeline = "Choose one";
    }
    if (data.companyWebsite && !/^https?:\/\//i.test(data.companyWebsite)) {
      data.companyWebsite = `https://${data.companyWebsite}`;
    }
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: "Please fix the highlighted fields.", fields: errors },
        { status: 400 }
      );
    }

    const location = [data.companyCity, data.companyCountry].filter(Boolean).join(", ");

    await prisma.$transaction([
      prisma.recruiterProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...data },
        update: data,
      }),
      // Pre-fill the editable employer profile on /profile, but don't
      // overwrite one the recruiter has already edited there.
      prisma.employerProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          companyName: data.companyName,
          location,
          email: user.email,
          phone: data.phone,
          linkedin: data.linkedin,
        },
        update: {},
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { onboardedAt: user.onboardedAt ?? new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true, redirectTo: "/candidates" });
  } catch (err) {
    console.error("onboarding error:", err);
    return NextResponse.json(
      { error: "Couldn't save your profile. Please try again." },
      { status: 500 }
    );
  }
}
