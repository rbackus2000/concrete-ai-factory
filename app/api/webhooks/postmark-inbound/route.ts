import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unenrollFromTriggers } from "@/lib/services/marketing-service";
import { addActivity } from "@/lib/services/contact-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fromEmail = (body.FromFull?.Email ?? body.From ?? "").toLowerCase();

    if (!fromEmail) {
      return NextResponse.json({ error: "No sender email" }, { status: 400 });
    }

    // Find contact by email
    const contact = await prisma.contact.findUnique({
      where: { email: fromEmail },
    });
    if (!contact) {
      return NextResponse.json({ data: { matched: false } });
    }

    // Find most recent email log for this contact
    const recentLog = await prisma.emailLog.findFirst({
      where: { contactId: contact.id },
      orderBy: { sentAt: "desc" },
      include: { enrollment: true },
    });

    if (recentLog) {
      await prisma.emailLog.update({
        where: { id: recentLog.id },
        data: { repliedAt: new Date() },
      });

      // Unenroll from the sequence that sent this email
      if (recentLog.enrollment) {
        await prisma.sequenceEnrollment.update({
          where: { id: recentLog.enrollment.id },
          data: {
            status: "UNENROLLED",
            unenrollReason: "REPLIED",
            unenrolledAt: new Date(),
          },
        });
      }
    }

    // Log activity
    await addActivity(
      contact.id,
      "EMAIL_REPLIED",
      `Contact replied to marketing email`,
      "system",
    ).catch(() => {});

    return NextResponse.json({ data: { matched: true, contactId: contact.id } });
  } catch (err) {
    console.error("Postmark inbound webhook error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
