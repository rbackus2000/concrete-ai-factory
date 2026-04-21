import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/shared";
import { getSystemActor } from "@/lib/auth/session";
import { sendReminderSchema } from "@/lib/schemas/invoice";
import { getInvoice, recordReminder } from "@/lib/services/invoice-service";
import { sendInvoiceReminderEmail } from "@/lib/services/postmark-service";

function getActor(request: NextRequest) {
  return authenticateRequest(request.headers.get("authorization")) ?? getSystemActor();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = sendReminderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const invoice = await getInvoice(id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const now = new Date();
  const dueDate = new Date(invoice.dueDate);
  const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / 86400000));

  try {
    await sendInvoiceReminderEmail({
      to: invoice.contactEmail,
      invoiceNumber: invoice.invoiceNumber,
      contactName: invoice.contactName,
      amountDue: invoice.amountDue,
      dueDate: dueDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      daysOverdue,
      publicToken: invoice.publicToken,
    });

    await recordReminder(id, parsed.data.type, invoice.contactEmail);

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send reminder";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
