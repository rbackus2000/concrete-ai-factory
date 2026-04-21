import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PREBUILT_SEQUENCES = [
  {
    name: "Quote Follow-Up — 3 Step",
    description: "Automated follow-up when a quote is sent to a customer",
    trigger: "QUOTE_SENT" as const,
    steps: [
      {
        stepNumber: 1,
        delayDays: 1,
        subject: "Quick check-in on your RB Studio quote",
        tone: "friendly",
        bodyHtml: `<p>Hi [contactName],</p>
<p>Just wanted to follow up on the quote we sent over yesterday. We're excited about the possibility of creating something special for you.</p>
<p>If you have any questions about materials, timelines, or customization options, I'm happy to walk you through everything.</p>
<p><a href="[quoteLink]" style="display:inline-block;padding:12px 28px;background:#c8a96e;color:#0a0a0a;text-decoration:none;font-weight:600;border-radius:6px;">View Your Quote</a></p>
<p>Looking forward to hearing from you.</p>`,
      },
      {
        stepNumber: 2,
        delayDays: 3,
        subject: "Did you get a chance to review your quote?",
        tone: "friendly",
        bodyHtml: `<p>Hi [contactName],</p>
<p>I wanted to make sure our quote reached you. Each piece we create is handcrafted specifically for you, and we'd love to answer any questions you might have.</p>
<p>Whether it's about the concrete finish, dimensions, or installation — we're here to help make this easy.</p>
<p><a href="[quoteLink]" style="display:inline-block;padding:12px 28px;background:#c8a96e;color:#0a0a0a;text-decoration:none;font-weight:600;border-radius:6px;">Review Quote</a></p>`,
      },
      {
        stepNumber: 3,
        delayDays: 7,
        subject: "Your RB Studio quote expires soon",
        tone: "urgent",
        bodyHtml: `<p>Hi [contactName],</p>
<p>Just a heads-up — your custom quote from RB Studio will be expiring soon. We'd hate for you to miss out on securing your piece at this price.</p>
<p>If you're ready to move forward, you can approve the quote with one click below.</p>
<p><a href="[quoteLink]" style="display:inline-block;padding:12px 28px;background:#c8a96e;color:#0a0a0a;text-decoration:none;font-weight:600;border-radius:6px;">Approve Quote Now</a></p>
<p>Have questions? Just reply to this email.</p>`,
      },
    ],
  },
  {
    name: "Post-Quote View — Sign Nudge",
    description: "Follow-up when customer views quote but hasn't signed after 2 days",
    trigger: "QUOTE_VIEWED_UNSIGNED_2DAY" as const,
    steps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: "Questions about your quote? We're here",
        tone: "friendly",
        bodyHtml: `<p>Hi [contactName],</p>
<p>We noticed you've been reviewing your RB Studio quote. If anything needs clarification — whether it's about the materials, the timeline, or customization options — I'm here to help.</p>
<p>Every piece we create is made to order, so we want to make sure everything is exactly right for you.</p>
<p><a href="[quoteLink]" style="display:inline-block;padding:12px 28px;background:#c8a96e;color:#0a0a0a;text-decoration:none;font-weight:600;border-radius:6px;">View Your Quote</a></p>`,
      },
      {
        stepNumber: 2,
        delayDays: 3,
        subject: "Ready to move forward on your custom piece?",
        tone: "friendly",
        bodyHtml: `<p>Hi [contactName],</p>
<p>Just checking in one more time. Approving your quote is simple — just click below, review the details, and sign to lock in your order.</p>
<p>Once approved, we'll begin crafting your piece right away.</p>
<p><a href="[quoteLink]" style="display:inline-block;padding:12px 28px;background:#c8a96e;color:#0a0a0a;text-decoration:none;font-weight:600;border-radius:6px;">Approve & Sign</a></p>`,
      },
    ],
  },
  {
    name: "Invoice Payment Reminder — Escalating",
    description: "Escalating reminders when an invoice goes overdue",
    trigger: "INVOICE_OVERDUE" as const,
    steps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: "Invoice [invoiceNumber] — payment due today",
        tone: "friendly",
        bodyHtml: `<p>Hi [contactName],</p>
<p>This is a friendly reminder that your invoice <strong>[invoiceNumber]</strong> is due today.</p>
<p>You can view and pay your invoice securely online.</p>
<p><a href="[invoiceLink]" style="display:inline-block;padding:12px 28px;background:#c8a96e;color:#0a0a0a;text-decoration:none;font-weight:600;border-radius:6px;">Pay Invoice</a></p>
<p>If you've already sent payment, please disregard this message.</p>`,
      },
      {
        stepNumber: 2,
        delayDays: 3,
        subject: "Invoice [invoiceNumber] — 3 days past due",
        tone: "firm",
        bodyHtml: `<p>Hi [contactName],</p>
<p>Your invoice <strong>[invoiceNumber]</strong> is now 3 days past due. We'd appreciate it if you could take a moment to settle this balance.</p>
<p><a href="[invoiceLink]" style="display:inline-block;padding:12px 28px;background:#c8a96e;color:#0a0a0a;text-decoration:none;font-weight:600;border-radius:6px;">Pay Now</a></p>
<p>Questions about your invoice? Reply to this email and we'll sort it out.</p>`,
      },
      {
        stepNumber: 3,
        delayDays: 7,
        subject: "Urgent: Invoice [invoiceNumber] is 7 days overdue",
        tone: "urgent",
        bodyHtml: `<p>Hi [contactName],</p>
<p>This is an urgent reminder that invoice <strong>[invoiceNumber]</strong> is now 7 days overdue.</p>
<p>Please submit payment at your earliest convenience to avoid any disruption to your project.</p>
<p><a href="[invoiceLink]" style="display:inline-block;padding:12px 28px;background:#c8a96e;color:#0a0a0a;text-decoration:none;font-weight:600;border-radius:6px;">Pay Now</a></p>`,
      },
      {
        stepNumber: 4,
        delayDays: 14,
        subject: "Final notice — Invoice [invoiceNumber]",
        tone: "urgent",
        bodyHtml: `<p>Hi [contactName],</p>
<p>This is our final notice regarding invoice <strong>[invoiceNumber]</strong>, which is now 14 days overdue.</p>
<p>Please arrange payment immediately. If there's an issue preventing payment, please contact us right away so we can work together on a resolution.</p>
<p><a href="[invoiceLink]" style="display:inline-block;padding:12px 28px;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:600;border-radius:6px;">Pay Overdue Invoice</a></p>`,
      },
    ],
  },
  {
    name: "Post-Purchase — Thank You & Review",
    description: "Thank you and review request after order delivery",
    trigger: "ORDER_DELIVERED" as const,
    steps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: "Your RB Studio piece has arrived!",
        tone: "celebratory",
        bodyHtml: `<p>Hi [contactName],</p>
<p>Your custom concrete piece has been delivered! We hope the unboxing moment is everything you imagined.</p>
<p>Each piece is handcrafted in our studio with care and precision. We're proud that this one is now yours.</p>
<p>If you have any questions about care, installation, or just want to share how it looks in its new home — we'd love to hear from you.</p>
<p>Thank you for choosing RB Studio.</p>`,
      },
      {
        stepNumber: 2,
        delayDays: 7,
        subject: "How are you loving your [productName]?",
        tone: "friendly",
        bodyHtml: `<p>Hi [contactName],</p>
<p>It's been a week since your piece arrived. How's it looking in its new space?</p>
<p>If you need any guidance on care and maintenance, or if anything isn't quite right, don't hesitate to reach out. We stand behind every piece we create.</p>
<p>We'd love to see photos if you're willing to share!</p>`,
      },
      {
        stepNumber: 3,
        delayDays: 21,
        subject: "Would you share your experience with RB Studio?",
        tone: "friendly",
        bodyHtml: `<p>Hi [contactName],</p>
<p>We hope you're still loving your custom concrete piece. Your feedback means the world to a small studio like ours.</p>
<p>If you have a moment, we'd be grateful if you could share your experience. A few words about the quality, the process, or how the piece looks in your space goes a long way.</p>
<p>Simply reply to this email with your thoughts. Thank you!</p>`,
      },
      {
        stepNumber: 4,
        delayDays: 45,
        subject: "Planning your next custom piece?",
        tone: "friendly",
        bodyHtml: `<p>Hi [contactName],</p>
<p>Now that you've lived with your RB Studio piece, you know the quality firsthand. We're always creating new designs and working with clients on custom projects.</p>
<p>Whether you're thinking about another sink, a concrete countertop, or a decorative panel — we'd love to bring your next idea to life.</p>
<p>Just reply to this email or reach out any time. We're here when you're ready.</p>`,
      },
    ],
  },
  {
    name: "New Contact Welcome",
    description: "Welcome sequence for new contacts added to CRM",
    trigger: "NEW_CONTACT" as const,
    steps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: "Welcome — here's what RB Studio creates",
        tone: "friendly",
        bodyHtml: `<p>Hi [contactName],</p>
<p>Welcome to RB Studio. We're a concrete artistry studio specializing in handcrafted GFRC (Glass Fiber Reinforced Concrete) pieces.</p>
<p>From custom vessel sinks to architectural panels, every piece we create is made to order in our Texas studio. No mass production — just precision craftsmanship.</p>
<p>We're glad you're here, and we look forward to creating something special for you.</p>`,
      },
      {
        stepNumber: 2,
        delayDays: 3,
        subject: "How custom concrete work works",
        tone: "friendly",
        bodyHtml: `<p>Hi [contactName],</p>
<p>Curious how a custom concrete piece goes from idea to reality? Here's the process:</p>
<ol>
<li><strong>Consultation</strong> — We discuss your vision, space, and requirements</li>
<li><strong>Quote</strong> — You receive a detailed quote with material specs and timeline</li>
<li><strong>Production</strong> — Your piece is handcrafted in our studio (typically 2-4 weeks)</li>
<li><strong>Quality Check</strong> — Every piece passes our QC process before shipping</li>
<li><strong>Delivery</strong> — Carefully packaged and shipped to your door</li>
</ol>
<p>Simple, transparent, and built around your timeline.</p>`,
      },
      {
        stepNumber: 3,
        delayDays: 7,
        subject: "Ready to get a quote?",
        tone: "friendly",
        bodyHtml: `<p>Hi [contactName],</p>
<p>When you're ready to explore a custom piece, getting a quote is easy. Just let us know what you're looking for — dimensions, style, finish — and we'll put together a detailed proposal.</p>
<p>No obligation, no pressure. Just honest pricing for exceptional craftsmanship.</p>
<p>Reply to this email or reach out any time. We're here to help.</p>`,
      },
    ],
  },
  {
    name: "Win-Back — Dormant Contact",
    description: "Re-engagement for contacts with no activity for 60+ days",
    trigger: "CONTACT_DORMANT_60DAY" as const,
    steps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: "It's been a while — we've been creating",
        tone: "friendly",
        bodyHtml: `<p>Hi [contactName],</p>
<p>It's been a while since we connected, and we wanted to reach out. Our studio has been busy — new designs, refined techniques, and some truly stunning pieces have come through our doors.</p>
<p>If you've been thinking about a custom concrete piece, we'd love to pick up where we left off.</p>
<p>Just reply to this email. We're here when you're ready.</p>`,
      },
      {
        stepNumber: 2,
        delayDays: 7,
        subject: "New pieces you might love",
        tone: "friendly",
        bodyHtml: `<p>Hi [contactName],</p>
<p>We've been expanding our collection with new finishes and designs. From textured vessel sinks to large-format architectural panels, there's a lot of fresh work to explore.</p>
<p>Every piece is still made by hand, one at a time, right here in our studio.</p>
<p>Interested in seeing what's new? Just reply — we'd love to show you.</p>`,
      },
      {
        stepNumber: 3,
        delayDays: 14,
        subject: "Still thinking about custom concrete?",
        tone: "friendly",
        bodyHtml: `<p>Hi [contactName],</p>
<p>This is our last note for now. If custom concrete work is on your radar — even down the road — we're always here.</p>
<p>No rush, no pressure. When the time is right, just reach out and we'll make something incredible together.</p>
<p>Thank you for being part of the RB Studio community.</p>`,
      },
    ],
  },
];

async function main() {
  console.log("Seeding pre-built email sequences...");

  for (const seq of PREBUILT_SEQUENCES) {
    // Check if already exists
    const existing = await prisma.emailSequence.findFirst({
      where: { name: seq.name, isPrebuilt: true },
    });

    if (existing) {
      console.log(`  Skipping "${seq.name}" (already exists)`);
      continue;
    }

    await prisma.emailSequence.create({
      data: {
        name: seq.name,
        description: seq.description,
        trigger: seq.trigger,
        isActive: false,
        isPrebuilt: true,
        steps: {
          create: seq.steps.map((s) => ({
            stepNumber: s.stepNumber,
            delayDays: s.delayDays,
            subject: s.subject,
            bodyHtml: s.bodyHtml,
            tone: s.tone,
          })),
        },
      },
    });

    console.log(`  Created "${seq.name}" (${seq.steps.length} steps)`);
  }

  console.log("Done seeding sequences.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
