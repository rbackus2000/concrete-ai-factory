import { ServerClient } from "postmark";

const DOMAIN = "backusdesignco.com";

// ── Sender Addresses by Email Type ─────────────────────────

export type EmailSender = "quotes" | "invoices" | "orders" | "sales" | "marketing" | "ops" | "po" | "noreply" | "info";

const SENDER_MAP: Record<EmailSender, string> = {
  quotes: `Backus Design Co <quotes@${DOMAIN}>`,
  invoices: `Backus Design Co <invoices@${DOMAIN}>`,
  orders: `Backus Design Co <orders@${DOMAIN}>`,
  sales: `Backus Design Co <sales@${DOMAIN}>`,
  marketing: `Backus Design Co <hello@${DOMAIN}>`,
  ops: `Backus Design Co <ops@${DOMAIN}>`,
  po: `Backus Design Co <po@${DOMAIN}>`,
  noreply: `Backus Design Co <noreply@${DOMAIN}>`,
  info: `Backus Design Co <info@${DOMAIN}>`,
};

function getClient() {
  const apiKey = process.env.POSTMARK_API_KEY;
  if (!apiKey) {
    throw new Error("POSTMARK_API_KEY is not configured.");
  }
  return new ServerClient(apiKey);
}

function getOwnerEmail() {
  return process.env.OWNER_EMAIL ?? `robert@${DOMAIN}`;
}

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  htmlBody: string;
  from?: EmailSender;
}) {
  const client = getClient();
  return client.sendEmail({
    From: SENDER_MAP[input.from ?? "noreply"],
    To: input.to,
    Subject: input.subject,
    HtmlBody: input.htmlBody,
  });
}

// ── Email Templates ──────────────────────────────────────────

function emailWrapper(content: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; background: #f5f5f5; }
    .header { background: #0a0a0a; padding: 24px 32px; }
    .header img { height: 40px; }
    .header-text { color: #c8a96e; font-size: 20px; font-weight: 600; letter-spacing: 0.5px; }
    .content { background: #ffffff; max-width: 600px; margin: 0 auto; padding: 32px; }
    .footer { text-align: center; padding: 24px 32px; color: #999; font-size: 12px; background: #0a0a0a; }
    .footer a { color: #c8a96e; }
    .btn { display: inline-block; padding: 12px 28px; background: #c8a96e; color: #0a0a0a; text-decoration: none; font-weight: 600; border-radius: 6px; }
    .amount { font-size: 28px; font-weight: 700; color: #0a0a0a; }
    .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    h2 { margin: 0 0 16px; color: #0a0a0a; }
    p { line-height: 1.6; margin: 0 0 12px; }
  </style>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto;">
    <div class="header">
      <span class="header-text">Backus Design Co</span>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Backus Design Co — Architectural Concrete Studio</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendQuoteSentEmail(input: {
  to: string;
  quoteNumber: string;
  contactName: string;
  total: number;
  publicToken: string;
  validUntil: string | null;
}) {
  const quoteUrl = `${getAppUrl()}/q/${input.publicToken}`;
  const validLine = input.validUntil
    ? `<p style="color: #666;">This quote is valid until <strong>${input.validUntil}</strong>.</p>`
    : "";

  const html = emailWrapper(`
    <h2>Your Quote is Ready</h2>
    <p>Hi ${input.contactName},</p>
    <p>Thank you for your interest in Backus Design Co. We've prepared a custom quote for you:</p>
    <hr class="divider">
    <p style="text-align: center;">
      <span style="color: #666; font-size: 14px;">Quote ${input.quoteNumber}</span><br>
      <span class="amount">$${input.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
    </p>
    <hr class="divider">
    ${validLine}
    <p style="text-align: center; margin-top: 24px;">
      <a href="${quoteUrl}" class="btn">View & Approve Quote</a>
    </p>
    <p style="color: #999; font-size: 12px; margin-top: 24px;">
      If you have any questions, simply reply to this email.
    </p>
  `);

  return sendEmail({
    to: input.to,
    subject: `Your Backus Design Co Quote #${input.quoteNumber} is Ready`,
    htmlBody: html,
    from: "quotes",
  });
}

export async function sendSignedConfirmationEmail(input: {
  to: string;
  quoteNumber: string;
  contactName: string;
  total: number;
  itemCount: number;
}) {
  const html = emailWrapper(`
    <h2>Quote Signed — Thank You!</h2>
    <p>Hi ${input.contactName},</p>
    <p>We've received your signed approval for Quote <strong>#${input.quoteNumber}</strong>.</p>
    <hr class="divider">
    <p><strong>Items:</strong> ${input.itemCount}</p>
    <p><strong>Total:</strong> $${input.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
    <hr class="divider">
    <p>We'll contact you within <strong>1 business day</strong> to discuss next steps.</p>
    <p>Thank you for choosing Backus Design Co.</p>
  `);

  return sendEmail({
    to: input.to,
    subject: `Quote #${input.quoteNumber} Signed — We'll Be In Touch!`,
    htmlBody: html,
    from: "quotes",
  });
}

export async function sendSignedOwnerNotification(input: {
  quoteId: string;
  quoteNumber: string;
  signerName: string;
  contactEmail: string;
  contactPhone: string | null;
  companyName: string | null;
  total: number;
  itemCount: number;
  signedAt: string;
}) {
  const internalUrl = `${getAppUrl()}/quotes/${input.quoteId}`;

  const html = emailWrapper(`
    <h2>Quote Signed!</h2>
    <p>Quote <strong>#${input.quoteNumber}</strong> has been signed.</p>
    <hr class="divider">
    <p><strong>Signer:</strong> ${input.signerName}</p>
    <p><strong>Email:</strong> ${input.contactEmail}</p>
    ${input.contactPhone ? `<p><strong>Phone:</strong> ${input.contactPhone}</p>` : ""}
    ${input.companyName ? `<p><strong>Company:</strong> ${input.companyName}</p>` : ""}
    <p><strong>Items:</strong> ${input.itemCount}</p>
    <p><strong>Total:</strong> $${input.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
    <p><strong>Signed at:</strong> ${input.signedAt}</p>
    <hr class="divider">
    <p style="text-align: center; margin-top: 16px;">
      <a href="${internalUrl}" class="btn">View Quote Details</a>
    </p>
  `);

  return sendEmail({
    to: getOwnerEmail(),
    subject: `Quote #${input.quoteNumber} Signed by ${input.signerName}`,
    htmlBody: html,
    from: "sales",
  });
}

// ── Invoice Emails ──────────────────────────────────────────

export async function sendInvoiceSentEmail(input: {
  to: string;
  invoiceNumber: string;
  contactName: string;
  total: number;
  amountDue: number;
  dueDate: string;
  publicToken: string;
}) {
  const invoiceUrl = `${getAppUrl()}/inv/${input.publicToken}`;

  const html = emailWrapper(`
    <h2>Invoice from Backus Design Co</h2>
    <p>Hi ${input.contactName},</p>
    <p>Please find your invoice below. Payment is due by <strong>${input.dueDate}</strong>.</p>
    <hr class="divider">
    <p style="text-align: center;">
      <span style="color: #666; font-size: 14px;">Invoice ${input.invoiceNumber}</span><br>
      <span class="amount">$${input.amountDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span><br>
      <span style="color: #666; font-size: 13px;">due ${input.dueDate}</span>
    </p>
    <hr class="divider">
    <p style="text-align: center; margin-top: 24px;">
      <a href="${invoiceUrl}" class="btn">View Invoice & Pay</a>
    </p>
    <p style="color: #999; font-size: 12px; margin-top: 24px;">
      If you have any questions, simply reply to this email.
    </p>
  `);

  return sendEmail({
    to: input.to,
    subject: `Invoice #${input.invoiceNumber} from Backus Design Co — $${input.amountDue.toLocaleString("en-US", { minimumFractionDigits: 2 })} due ${input.dueDate}`,
    htmlBody: html,
    from: "invoices",
  });
}

export async function sendInvoiceReminderEmail(input: {
  to: string;
  invoiceNumber: string;
  contactName: string;
  amountDue: number;
  dueDate: string;
  daysOverdue: number;
  publicToken: string;
}) {
  const invoiceUrl = `${getAppUrl()}/inv/${input.publicToken}`;
  const isOverdue = input.daysOverdue > 0;

  const tone = isOverdue
    ? `<p>This is a reminder that Invoice <strong>#${input.invoiceNumber}</strong> was due on <strong>${input.dueDate}</strong> and is now <strong>${input.daysOverdue} days overdue</strong>.</p>
       <p>Please submit payment at your earliest convenience to avoid any disruption to your project.</p>`
    : `<p>Just a friendly reminder that Invoice <strong>#${input.invoiceNumber}</strong> is due on <strong>${input.dueDate}</strong>.</p>
       <p>If you've already sent payment, please disregard this message.</p>`;

  const html = emailWrapper(`
    <h2>Payment Reminder</h2>
    <p>Hi ${input.contactName},</p>
    ${tone}
    <hr class="divider">
    <p style="text-align: center;">
      <span style="color: ${isOverdue ? "#dc2626" : "#666"}; font-size: 14px;">${isOverdue ? "OVERDUE" : "Amount Due"}</span><br>
      <span class="amount" style="${isOverdue ? "color: #dc2626;" : ""}">$${input.amountDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
    </p>
    <hr class="divider">
    <p style="text-align: center; margin-top: 24px;">
      <a href="${invoiceUrl}" class="btn">Pay Now</a>
    </p>
    <p style="color: #999; font-size: 12px; margin-top: 24px;">
      Questions? Reply to this email or call us directly.
    </p>
  `);

  const subject = isOverdue
    ? `OVERDUE: Invoice #${input.invoiceNumber} — $${input.amountDue.toLocaleString("en-US", { minimumFractionDigits: 2 })} past due`
    : `Reminder: Invoice #${input.invoiceNumber} due ${input.dueDate}`;

  return sendEmail({ to: input.to, subject, htmlBody: html, from: "invoices" });
}

export async function sendPaymentConfirmationEmail(input: {
  to: string;
  invoiceNumber: string;
  contactName: string;
  amountPaid: number;
  paymentMethod: string;
  isPaidInFull: boolean;
  remainingBalance: number;
}) {
  const methodLabel = input.paymentMethod.replace(/_/g, " ").toLowerCase();

  const html = emailWrapper(`
    <h2>Payment Received</h2>
    <p>Hi ${input.contactName},</p>
    <p>Thank you! We've received your payment.</p>
    <hr class="divider">
    <p><strong>Amount Paid:</strong> $${input.amountPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
    <p><strong>Method:</strong> ${methodLabel}</p>
    <p><strong>Invoice:</strong> #${input.invoiceNumber}</p>
    ${input.isPaidInFull
      ? `<p style="color: #16a34a; font-weight: 600;">Your invoice is paid in full. Thank you!</p>`
      : `<p><strong>Remaining Balance:</strong> $${input.remainingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>`
    }
    <hr class="divider">
    <p>Thank you for choosing Backus Design Co.</p>
  `);

  return sendEmail({
    to: input.to,
    subject: `Payment received — Invoice #${input.invoiceNumber}`,
    htmlBody: html,
    from: "invoices",
  });
}

// ── Order Emails ────────────────────────────────────────────

export async function sendOrderShippedEmail(input: {
  to: string;
  orderNumber: string;
  contactName: string;
  carrier: string;
  serviceLevel: string;
  trackingNumber: string;
  trackingUrl: string;
  estimatedDelivery: string | null;
  items: Array<{ name: string; quantity: number; imageUrl?: string | null }>;
}) {
  const itemsHtml = input.items
    .map((item) => `<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.name}</td><td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">x${item.quantity}</td></tr>`)
    .join("");

  const html = emailWrapper(`
    <h2>Your Order is On Its Way!</h2>
    <p>Hi ${input.contactName},</p>
    <p>Great news — your order <strong>#${input.orderNumber}</strong> has shipped!</p>
    <hr class="divider">
    <p><strong>Carrier:</strong> ${input.carrier} — ${input.serviceLevel}</p>
    <p><strong>Tracking Number:</strong> ${input.trackingNumber}</p>
    ${input.estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${input.estimatedDelivery}</p>` : ""}
    <hr class="divider">
    <p style="text-align: center; margin: 24px 0;">
      <a href="${input.trackingUrl}" class="btn">Track Your Package</a>
    </p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
      <tr style="border-bottom: 2px solid #eee;"><th style="text-align: left; padding: 8px 0;">Item</th><th style="text-align: right; padding: 8px 0;">Qty</th></tr>
      ${itemsHtml}
    </table>
    <hr class="divider">
    <p style="color: #999; font-size: 12px;">If you have any questions, reply to this email.</p>
  `);

  return sendEmail({
    to: input.to,
    subject: `Your Backus Design Co order #${input.orderNumber} has shipped!`,
    htmlBody: html,
    from: "orders",
  });
}

export async function sendOrderDeliveredEmail(input: {
  to: string;
  orderNumber: string;
  contactName: string;
}) {
  const html = emailWrapper(`
    <h2>Your Order Has Been Delivered!</h2>
    <p>Hi ${input.contactName},</p>
    <p>Your order <strong>#${input.orderNumber}</strong> has been delivered.</p>
    <p>We hope you love your new piece! If you have any questions or concerns about your delivery, please don't hesitate to reach out.</p>
    <hr class="divider">
    <p>Thank you for choosing Backus Design Co.</p>
  `);

  return sendEmail({
    to: input.to,
    subject: `Your Backus Design Co order #${input.orderNumber} has been delivered!`,
    htmlBody: html,
    from: "orders",
  });
}

export async function sendOrderExceptionOwnerEmail(input: {
  orderId: string;
  orderNumber: string;
  contactName: string;
  contactEmail: string;
  trackingNumber: string | null;
  carrier: string | null;
  exceptionMessage: string;
}) {
  const internalUrl = `${getAppUrl()}/orders/${input.orderId}`;

  const html = emailWrapper(`
    <h2 style="color: #dc2626;">Shipping Exception</h2>
    <p>Order <strong>#${input.orderNumber}</strong> has a shipping exception that needs attention.</p>
    <hr class="divider">
    <p><strong>Customer:</strong> ${input.contactName}</p>
    <p><strong>Email:</strong> ${input.contactEmail}</p>
    ${input.carrier ? `<p><strong>Carrier:</strong> ${input.carrier}</p>` : ""}
    ${input.trackingNumber ? `<p><strong>Tracking:</strong> ${input.trackingNumber}</p>` : ""}
    <p><strong>Exception:</strong> ${input.exceptionMessage}</p>
    <hr class="divider">
    <p style="text-align: center; margin-top: 16px;">
      <a href="${internalUrl}" class="btn" style="background: #dc2626; color: #fff;">View Order</a>
    </p>
  `);

  return sendEmail({
    to: getOwnerEmail(),
    subject: `Shipping exception on order #${input.orderNumber} — action needed`,
    htmlBody: html,
    from: "ops",
  });
}

export async function sendReturnLabelEmail(input: {
  to: string;
  orderNumber: string;
  contactName: string;
  reason: string;
  returnLabelUrl: string;
}) {
  const html = emailWrapper(`
    <h2>Your Return Label</h2>
    <p>Hi ${input.contactName},</p>
    <p>We've generated a prepaid return label for your order <strong>#${input.orderNumber}</strong>.</p>
    <hr class="divider">
    <p><strong>Return Reason:</strong> ${input.reason}</p>
    <p style="text-align: center; margin: 24px 0;">
      <a href="${input.returnLabelUrl}" class="btn">Download Return Label</a>
    </p>
    <hr class="divider">
    <h3>Return Instructions</h3>
    <ol style="line-height: 2;">
      <li>Print the return label</li>
      <li>Securely package the item(s)</li>
      <li>Attach the label to the outside of the package</li>
      <li>Drop off at your nearest carrier location</li>
    </ol>
    <p style="color: #999; font-size: 12px;">Once we receive your return, we'll process your refund or exchange within 5 business days.</p>
  `);

  return sendEmail({
    to: input.to,
    subject: `Your Backus Design Co return label for order #${input.orderNumber}`,
    htmlBody: html,
    from: "orders",
  });
}

export async function sendPaymentOwnerNotification(input: {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  amountPaid: number;
  paymentMethod: string;
  last4: string | null;
  brand: string | null;
  isPaidInFull: boolean;
  remainingBalance: number;
}) {
  const internalUrl = `${getAppUrl()}/invoices/${input.invoiceId}`;
  const methodLabel = input.paymentMethod.replace(/_/g, " ").toLowerCase();
  const cardInfo = input.last4 ? ` (${input.brand ?? "card"} ending ${input.last4})` : "";

  const html = emailWrapper(`
    <h2>Payment Received!</h2>
    <p><strong>$${input.amountPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong> received for Invoice <strong>#${input.invoiceNumber}</strong>.</p>
    <hr class="divider">
    <p><strong>Customer:</strong> ${input.customerName}</p>
    <p><strong>Email:</strong> ${input.customerEmail}</p>
    <p><strong>Method:</strong> ${methodLabel}${cardInfo}</p>
    <p><strong>Status:</strong> ${input.isPaidInFull ? "PAID IN FULL" : `Partial — $${input.remainingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} remaining`}</p>
    <hr class="divider">
    <p style="text-align: center; margin-top: 16px;">
      <a href="${internalUrl}" class="btn">View Invoice</a>
    </p>
  `);

  return sendEmail({
    to: getOwnerEmail(),
    subject: `$${input.amountPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })} payment received — Invoice #${input.invoiceNumber}`,
    htmlBody: html,
    from: "invoices",
  });
}
