/**
 * One-time migration script to:
 * 1. Assign clientNumbers to all existing contacts (oldest first → C0001)
 * 2. Regenerate all existing quote numbers using new format
 * 3. Regenerate all existing invoice numbers using new format
 * 4. Regenerate all existing order numbers using new format
 * 5. Assign return numbers to existing returns
 * 6. Assign project numbers to existing orders
 *
 * Run: npx tsx scripts/migrate-numbering.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Numbering System Migration ===\n");

  // ── Step 1: Assign clientNumbers to all contacts ──────────
  console.log("Step 1: Assigning client numbers to contacts...");

  const contacts = await prisma.contact.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, clientNumber: true },
  });

  let assigned = 0;
  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    const clientNumber = `C${String(i + 1).padStart(4, "0")}`;
    if (c.clientNumber !== clientNumber) {
      await prisma.contact.update({
        where: { id: c.id },
        data: { clientNumber },
      });
      assigned++;
    }
  }
  console.log(`  Assigned ${assigned} client numbers (${contacts.length} total contacts)\n`);

  // Build a lookup map: contactId → clientNumber
  const contactMap = new Map<string, string>();
  for (let i = 0; i < contacts.length; i++) {
    contactMap.set(contacts[i].id, `C${String(i + 1).padStart(4, "0")}`);
  }

  // ── Step 2: Regenerate quote numbers ──────────────────────
  console.log("Step 2: Regenerating quote numbers...");

  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, quoteNumber: true, contactId: true, createdAt: true },
  });

  // Group by contactId + year to get per-client-per-year sequence
  const quoteSeqMap = new Map<string, number>();
  let quotesUpdated = 0;

  for (const q of quotes) {
    const year = q.createdAt.getFullYear();
    const clientNum = q.contactId ? (contactMap.get(q.contactId) ?? "C0000") : "C0000";
    const key = `${clientNum}-${year}`;
    const seq = (quoteSeqMap.get(key) ?? 0) + 1;
    quoteSeqMap.set(key, seq);

    const newNumber = `RB-QT-${year}-${clientNum}-${String(seq).padStart(4, "0")}`;
    if (q.quoteNumber !== newNumber) {
      await prisma.quote.update({
        where: { id: q.id },
        data: { quoteNumber: newNumber },
      });
      quotesUpdated++;
    }
  }
  console.log(`  Updated ${quotesUpdated} quotes (${quotes.length} total)\n`);

  // ── Step 3: Regenerate invoice numbers ────────────────────
  console.log("Step 3: Regenerating invoice numbers...");

  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, invoiceNumber: true, contactId: true, createdAt: true },
  });

  const invoiceSeqMap = new Map<string, number>();
  let invoicesUpdated = 0;

  for (const inv of invoices) {
    const year = inv.createdAt.getFullYear();
    const clientNum = inv.contactId ? (contactMap.get(inv.contactId) ?? "C0000") : "C0000";
    const key = `${clientNum}-${year}`;
    const seq = (invoiceSeqMap.get(key) ?? 0) + 1;
    invoiceSeqMap.set(key, seq);

    const newNumber = `RB-INV-${year}-${clientNum}-${String(seq).padStart(4, "0")}`;
    if (inv.invoiceNumber !== newNumber) {
      await prisma.invoice.update({
        where: { id: inv.id },
        data: { invoiceNumber: newNumber },
      });
      invoicesUpdated++;
    }
  }
  console.log(`  Updated ${invoicesUpdated} invoices (${invoices.length} total)\n`);

  // ── Step 4: Regenerate order numbers + assign project numbers ─
  console.log("Step 4: Regenerating order numbers and assigning project numbers...");

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, orderNumber: true, projectNumber: true, contactId: true, createdAt: true },
  });

  const orderSeqMap = new Map<string, number>();
  const projectSeqMap = new Map<string, number>();
  let ordersUpdated = 0;

  for (const o of orders) {
    const year = o.createdAt.getFullYear();
    const clientNum = o.contactId ? (contactMap.get(o.contactId) ?? "C0000") : "C0000";

    const orderKey = `${clientNum}-${year}`;
    const orderSeq = (orderSeqMap.get(orderKey) ?? 0) + 1;
    orderSeqMap.set(orderKey, orderSeq);

    const projectKey = `${clientNum}-${year}`;
    const projectSeq = (projectSeqMap.get(projectKey) ?? 0) + 1;
    projectSeqMap.set(projectKey, projectSeq);

    const newOrderNumber = `RB-ORD-${year}-${clientNum}-${String(orderSeq).padStart(4, "0")}`;
    const newProjectNumber = `RB-PRJ-${year}-${clientNum}-${String(projectSeq).padStart(4, "0")}`;

    if (o.orderNumber !== newOrderNumber || o.projectNumber !== newProjectNumber) {
      await prisma.order.update({
        where: { id: o.id },
        data: { orderNumber: newOrderNumber, projectNumber: newProjectNumber },
      });
      ordersUpdated++;
    }
  }
  console.log(`  Updated ${ordersUpdated} orders (${orders.length} total)\n`);

  // ── Step 5: Assign return numbers ─────────────────────────
  console.log("Step 5: Assigning return numbers...");

  const returns = await prisma.orderReturn.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, returnNumber: true, createdAt: true, order: { select: { contactId: true } } },
  });

  const returnSeqMap = new Map<string, number>();
  let returnsUpdated = 0;

  for (const r of returns) {
    const year = r.createdAt.getFullYear();
    const contactId = r.order.contactId;
    const clientNum = contactId ? (contactMap.get(contactId) ?? "C0000") : "C0000";
    const key = `${clientNum}-${year}`;
    const seq = (returnSeqMap.get(key) ?? 0) + 1;
    returnSeqMap.set(key, seq);

    const newNumber = `RB-RTN-${year}-${clientNum}-${String(seq).padStart(4, "0")}`;
    if (r.returnNumber !== newNumber) {
      await prisma.orderReturn.update({
        where: { id: r.id },
        data: { returnNumber: newNumber },
      });
      returnsUpdated++;
    }
  }
  console.log(`  Updated ${returnsUpdated} returns (${returns.length} total)\n`);

  console.log("=== Migration Complete ===");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
