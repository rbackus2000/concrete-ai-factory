import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { contactFormSchema } from "@/lib/schemas/contact";
import { listContacts, createContact } from "@/lib/services/contact-service";
import { autoEnroll } from "@/lib/services/marketing-service";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const search = url.searchParams.get("search") || undefined;
  const stage = url.searchParams.get("stage") as "NEW" | "CONTACTED" | "QUOTED" | "NEGOTIATING" | "WON" | "LOST" | undefined;
  const tag = url.searchParams.get("tag") || undefined;
  const sort = url.searchParams.get("sort") || undefined;

  const contacts = await listContacts({ search, stage, tag, sort });
  return NextResponse.json({ data: contacts });
}

export async function POST(request: NextRequest) {
  const actor = getActor(request);
  const body = await request.json();
  const parsed = contactFormSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", message: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const contact = await createContact(parsed.data, actor);

    // Enroll in welcome sequence (fire-and-forget)
    autoEnroll(contact.id, "NEW_CONTACT").catch(() => {});

    return NextResponse.json({ data: contact }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create contact";
    const status = message.includes("Unique constraint") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
