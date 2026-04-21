import { NextResponse } from "next/server";

import { checkOverdueInvoices } from "@/lib/services/invoice-service";

export async function POST() {
  try {
    const count = await checkOverdueInvoices();
    return NextResponse.json({ data: { overdueCount: count } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to check overdue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
