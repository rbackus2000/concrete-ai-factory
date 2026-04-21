import { prisma } from "@/lib/db";
import { buildMarketingEmail, replaceTokens } from "@/lib/email-template";
import { sendEmail } from "@/lib/services/postmark-service";
import type {
  SequenceTrigger,
  EnrollmentStatus,
  CampaignStatus,
} from "@prisma/client";

// ── Sequences ────────────────────────────────────────────────

export async function listSequences(filters?: {
  isActive?: boolean;
  isPrebuilt?: boolean;
}) {
  const where: Record<string, unknown> = {};
  if (filters?.isActive !== undefined) where.isActive = filters.isActive;
  if (filters?.isPrebuilt !== undefined) where.isPrebuilt = filters.isPrebuilt;

  return prisma.emailSequence.findMany({
    where,
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSequence(id: string) {
  return prisma.emailSequence.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      enrollments: {
        include: {
          contact: { select: { id: true, name: true, email: true, stage: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      _count: { select: { enrollments: true } },
    },
  });
}

export async function createSequence(data: {
  name: string;
  description?: string;
  trigger: SequenceTrigger;
  isActive?: boolean;
  steps: Array<{
    stepNumber: number;
    delayDays: number;
    subject: string;
    bodyHtml: string;
    tone?: string;
  }>;
  createdBy?: string;
}) {
  return prisma.emailSequence.create({
    data: {
      name: data.name,
      description: data.description,
      trigger: data.trigger,
      isActive: data.isActive ?? false,
      createdBy: data.createdBy,
      steps: {
        create: data.steps.map((s) => ({
          stepNumber: s.stepNumber,
          delayDays: s.delayDays,
          subject: s.subject,
          bodyHtml: s.bodyHtml,
          tone: s.tone,
        })),
      },
    },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  });
}

export async function updateSequence(
  id: string,
  data: {
    name?: string;
    description?: string;
    trigger?: SequenceTrigger;
    isActive?: boolean;
    steps?: Array<{
      stepNumber: number;
      delayDays: number;
      subject: string;
      bodyHtml: string;
      tone?: string;
    }>;
  },
) {
  // If steps provided, delete existing and recreate
  if (data.steps) {
    await prisma.sequenceStep.deleteMany({ where: { sequenceId: id } });
  }

  return prisma.emailSequence.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.trigger !== undefined && { trigger: data.trigger }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.steps && {
        steps: {
          create: data.steps.map((s) => ({
            stepNumber: s.stepNumber,
            delayDays: s.delayDays,
            subject: s.subject,
            bodyHtml: s.bodyHtml,
            tone: s.tone,
          })),
        },
      }),
    },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  });
}

export async function toggleSequence(id: string) {
  const seq = await prisma.emailSequence.findUnique({ where: { id } });
  if (!seq) throw new Error("Sequence not found");
  return prisma.emailSequence.update({
    where: { id },
    data: { isActive: !seq.isActive },
  });
}

export async function deleteSequence(id: string) {
  return prisma.emailSequence.update({
    where: { id },
    data: { isActive: false },
  });
}

// ── Enrollments ──────────────────────────────────────────────

export async function enrollContact(
  sequenceId: string,
  contactId: string,
  triggerRefId?: string,
  triggerType?: string,
) {
  // Check contact not already active in this sequence
  const existing = await prisma.sequenceEnrollment.findFirst({
    where: { sequenceId, contactId, status: "ACTIVE" },
  });
  if (existing) return existing;

  // Check contact not unsubscribed
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact || contact.isUnsubscribed) return null;

  // Get first step to calculate nextSendAt
  const firstStep = await prisma.sequenceStep.findFirst({
    where: { sequenceId },
    orderBy: { stepNumber: "asc" },
  });
  if (!firstStep) return null;

  const nextSendAt = new Date();
  nextSendAt.setDate(nextSendAt.getDate() + firstStep.delayDays);

  const enrollment = await prisma.sequenceEnrollment.create({
    data: {
      sequenceId,
      contactId,
      triggerRefId,
      triggerType,
      currentStep: 0,
      nextSendAt,
    },
  });

  // Update totalEnrolled
  await prisma.emailSequence.update({
    where: { id: sequenceId },
    data: { totalEnrolled: { increment: 1 } },
  });

  return enrollment;
}

export async function unenrollContact(
  sequenceId: string,
  contactId: string,
  reason?: string,
) {
  const enrollment = await prisma.sequenceEnrollment.findFirst({
    where: { sequenceId, contactId, status: "ACTIVE" },
  });
  if (!enrollment) return null;

  return prisma.sequenceEnrollment.update({
    where: { id: enrollment.id },
    data: {
      status: "UNENROLLED",
      unenrollReason: reason ?? "MANUAL",
      unenrolledAt: new Date(),
    },
  });
}

/**
 * Unenroll a contact from all sequences matching given triggers.
 */
export async function unenrollFromTriggers(
  contactId: string,
  triggers: SequenceTrigger[],
  reason: string,
) {
  const enrollments = await prisma.sequenceEnrollment.findMany({
    where: {
      contactId,
      status: "ACTIVE",
      sequence: { trigger: { in: triggers } },
    },
  });

  for (const enrollment of enrollments) {
    await prisma.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: "UNENROLLED",
        unenrollReason: reason,
        unenrolledAt: new Date(),
      },
    });
  }

  return enrollments.length;
}

/**
 * Auto-enroll a contact in the first active sequence matching a trigger.
 */
export async function autoEnroll(
  contactId: string,
  trigger: SequenceTrigger,
  triggerRefId?: string,
) {
  const sequence = await prisma.emailSequence.findFirst({
    where: { trigger, isActive: true },
  });
  if (!sequence) return null;
  return enrollContact(sequence.id, contactId, triggerRefId, trigger);
}

// ── Sequence Processing (Cron Engine) ────────────────────────

export async function processSequenceEmails(): Promise<number> {
  const now = new Date();
  const dueEnrollments = await prisma.sequenceEnrollment.findMany({
    where: {
      status: "ACTIVE",
      nextSendAt: { lte: now },
    },
    include: {
      sequence: { include: { steps: { orderBy: { stepNumber: "asc" } } } },
      contact: true,
    },
    take: 100,
  });

  let sentCount = 0;

  for (const enrollment of dueEnrollments) {
    const { contact, sequence } = enrollment;
    if (contact.isUnsubscribed) {
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "UNENROLLED", unenrollReason: "UNSUBSCRIBED", unenrolledAt: now },
      });
      continue;
    }

    const currentStepIndex = enrollment.currentStep;
    const step = sequence.steps[currentStepIndex];
    if (!step) {
      // All steps done
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "COMPLETED" },
      });
      continue;
    }

    // Build personalized email
    const tokens: Record<string, string | undefined> = {
      contactName: contact.name,
      contactEmail: contact.email,
    };

    // Load trigger reference data for tokens
    if (enrollment.triggerRefId) {
      await enrichTokens(tokens, enrollment.triggerType, enrollment.triggerRefId);
    }

    const personalizedSubject = replaceTokens(step.subject, tokens);
    const personalizedBody = replaceTokens(step.bodyHtml, tokens);

    // Create email log first to get trackingToken
    const emailLog = await prisma.emailLog.create({
      data: {
        enrollmentId: enrollment.id,
        contactId: contact.id,
        toEmail: contact.email,
        subject: personalizedSubject,
        bodyHtml: personalizedBody,
        stepNumber: step.stepNumber,
      },
    });

    // Build full marketing email with tracking
    const fullHtml = buildMarketingEmail({
      subject: personalizedSubject,
      bodyHtml: personalizedBody,
      trackingToken: emailLog.trackingToken,
    });

    try {
      const result = await sendEmail({
        to: contact.email,
        subject: personalizedSubject,
        htmlBody: fullHtml,
      });

      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { postmarkMessageId: result.MessageID },
      });

      // Update step analytics
      await prisma.sequenceStep.update({
        where: { id: step.id },
        data: { sentCount: { increment: 1 } },
      });

      // Update sequence totals
      await prisma.emailSequence.update({
        where: { id: sequence.id },
        data: { totalSent: { increment: 1 } },
      });

      // Advance enrollment
      const nextStepIndex = currentStepIndex + 1;
      if (nextStepIndex < sequence.steps.length) {
        const nextStep = sequence.steps[nextStepIndex];
        const nextSendAt = new Date();
        nextSendAt.setDate(nextSendAt.getDate() + nextStep.delayDays);
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { currentStep: nextStepIndex, nextSendAt },
        });
      } else {
        await prisma.sequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "COMPLETED", currentStep: nextStepIndex },
        });
      }

      sentCount++;
    } catch (err) {
      console.error(`Failed to send sequence email to ${contact.email}:`, err);
    }
  }

  return sentCount;
}

async function enrichTokens(
  tokens: Record<string, string | undefined>,
  triggerType: string | null,
  refId: string,
) {
  if (triggerType?.startsWith("QUOTE")) {
    const quote = await prisma.quote.findUnique({
      where: { id: refId },
      select: {
        quoteNumber: true,
        total: true,
        validUntil: true,
        publicToken: true,
        lineItems: { select: { name: true }, take: 1 },
      },
    });
    if (quote) {
      tokens.quoteNumber = quote.quoteNumber;
      tokens.quoteTotal = `$${quote.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
      tokens.quoteLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/q/${quote.publicToken}`;
      tokens.productName = quote.lineItems[0]?.name;
      if (quote.validUntil) {
        tokens.dueDate = quote.validUntil.toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric",
        });
      }
    }
  }

  if (triggerType?.startsWith("INVOICE")) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: refId },
      select: {
        invoiceNumber: true,
        total: true,
        amountDue: true,
        dueDate: true,
        publicToken: true,
      },
    });
    if (invoice) {
      tokens.invoiceNumber = invoice.invoiceNumber;
      tokens.invoiceLink = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/inv/${invoice.publicToken}`;
      tokens.dueDate = invoice.dueDate.toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      });
    }
  }

  if (triggerType === "ORDER_DELIVERED") {
    const order = await prisma.order.findUnique({
      where: { id: refId },
      select: {
        orderNumber: true,
        trackingNumber: true,
        lineItems: { select: { name: true }, take: 1 },
      },
    });
    if (order) {
      tokens.orderNumber = order.orderNumber;
      tokens.trackingNumber = order.trackingNumber ?? undefined;
      tokens.productName = order.lineItems[0]?.name;
    }
  }
}

// ── Campaigns ────────────────────────────────────────────────

export async function listCampaigns(filters?: { status?: CampaignStatus }) {
  const where: Record<string, unknown> = {};
  if (filters?.status) where.status = filters.status;

  return prisma.emailCampaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { logs: true } } },
  });
}

export async function getCampaign(id: string) {
  return prisma.emailCampaign.findUnique({
    where: { id },
    include: {
      logs: {
        include: {
          contact: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      },
    },
  });
}

export async function createCampaign(data: {
  name: string;
  subject: string;
  bodyHtml: string;
  segmentType: string;
  segmentConfig?: string;
  createdBy?: string;
}) {
  // Count recipients
  const count = await resolveRecipientCount(data.segmentType, data.segmentConfig);

  return prisma.emailCampaign.create({
    data: {
      name: data.name,
      subject: data.subject,
      bodyHtml: data.bodyHtml,
      segmentType: data.segmentType,
      segmentConfig: data.segmentConfig,
      recipientCount: count,
      createdBy: data.createdBy,
    },
  });
}

export async function updateCampaign(
  id: string,
  data: {
    name?: string;
    subject?: string;
    bodyHtml?: string;
    segmentType?: string;
    segmentConfig?: string;
  },
) {
  const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
  if (!campaign || campaign.status !== "DRAFT") {
    throw new Error("Can only edit DRAFT campaigns");
  }

  const count =
    data.segmentType || data.segmentConfig
      ? await resolveRecipientCount(
          data.segmentType ?? campaign.segmentType,
          data.segmentConfig ?? campaign.segmentConfig ?? undefined,
        )
      : campaign.recipientCount;

  return prisma.emailCampaign.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.subject !== undefined && { subject: data.subject }),
      ...(data.bodyHtml !== undefined && { bodyHtml: data.bodyHtml }),
      ...(data.segmentType !== undefined && { segmentType: data.segmentType }),
      ...(data.segmentConfig !== undefined && { segmentConfig: data.segmentConfig }),
      recipientCount: count,
    },
  });
}

export async function sendCampaign(id: string, sendNow: boolean, scheduledAt?: string) {
  const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
    throw new Error("Campaign already sent or cancelled");
  }

  if (sendNow) {
    await prisma.emailCampaign.update({
      where: { id },
      data: { status: "SENDING" },
    });

    const sentCount = await executeCampaignSend(id);

    return prisma.emailCampaign.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date(), sentCount },
    });
  } else {
    return prisma.emailCampaign.update({
      where: { id },
      data: { status: "SCHEDULED", scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined },
    });
  }
}

export async function cancelCampaign(id: string) {
  const campaign = await prisma.emailCampaign.findUnique({ where: { id } });
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
    throw new Error("Can only cancel DRAFT or SCHEDULED campaigns");
  }
  return prisma.emailCampaign.update({ where: { id }, data: { status: "CANCELLED" } });
}

async function executeCampaignSend(campaignId: string): Promise<number> {
  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return 0;

  const recipients = await resolveRecipients(campaign.segmentType, campaign.segmentConfig);
  let sentCount = 0;

  for (const contact of recipients) {
    const tokens: Record<string, string | undefined> = {
      contactName: contact.name,
      contactEmail: contact.email,
    };

    const personalizedSubject = replaceTokens(campaign.subject, tokens);
    const personalizedBody = replaceTokens(campaign.bodyHtml, tokens);

    const emailLog = await prisma.emailLog.create({
      data: {
        campaignId,
        contactId: contact.id,
        toEmail: contact.email,
        subject: personalizedSubject,
        bodyHtml: personalizedBody,
      },
    });

    const fullHtml = buildMarketingEmail({
      subject: personalizedSubject,
      bodyHtml: personalizedBody,
      trackingToken: emailLog.trackingToken,
    });

    try {
      const result = await sendEmail({
        to: contact.email,
        subject: personalizedSubject,
        htmlBody: fullHtml,
      });

      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { postmarkMessageId: result.MessageID },
      });

      sentCount++;
    } catch (err) {
      console.error(`Failed to send campaign email to ${contact.email}:`, err);
    }
  }

  return sentCount;
}

async function resolveRecipients(segmentType: string, segmentConfig: string | null) {
  const baseWhere = { isUnsubscribed: false };

  switch (segmentType) {
    case "STAGE": {
      const stage = segmentConfig as string;
      return prisma.contact.findMany({
        where: { ...baseWhere, stage: stage as never },
        select: { id: true, name: true, email: true },
      });
    }
    case "TAG": {
      const tag = segmentConfig as string;
      return prisma.contact.findMany({
        where: { ...baseWhere, tags: { has: tag } },
        select: { id: true, name: true, email: true },
      });
    }
    case "HAS_OPEN_QUOTE":
      return prisma.contact.findMany({
        where: {
          ...baseWhere,
          quotes: { some: { status: { in: ["SENT", "VIEWED"] } } },
        },
        select: { id: true, name: true, email: true },
      });
    case "HAS_OVERDUE_INVOICE":
      return prisma.contact.findMany({
        where: {
          ...baseWhere,
          invoices: { some: { status: "OVERDUE" } },
        },
        select: { id: true, name: true, email: true },
      });
    default:
      return prisma.contact.findMany({
        where: baseWhere,
        select: { id: true, name: true, email: true },
      });
  }
}

async function resolveRecipientCount(segmentType: string, segmentConfig?: string): Promise<number> {
  const recipients = await resolveRecipients(segmentType, segmentConfig ?? null);
  return recipients.length;
}

// ── Scheduled Campaign Processing ────────────────────────────

export async function processScheduledCampaigns(): Promise<number> {
  const now = new Date();
  const campaigns = await prisma.emailCampaign.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now } },
  });

  let processed = 0;
  for (const campaign of campaigns) {
    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: { status: "SENDING" },
    });

    const sentCount = await executeCampaignSend(campaign.id);

    await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: { status: "SENT", sentAt: now, sentCount },
    });

    processed++;
  }

  return processed;
}

// ── Trigger Checking (Cron) ──────────────────────────────────

export async function checkAndEnrollTriggers(): Promise<number> {
  const now = new Date();
  let enrolled = 0;

  // QUOTE_UNOPENED_3DAY: quotes sent 3+ days ago with no view
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const unopenedQuotes = await prisma.quote.findMany({
    where: {
      status: "SENT",
      sentAt: { lte: threeDaysAgo },
      viewedAt: null,
      contactId: { not: null },
    },
    select: { id: true, contactId: true },
  });

  for (const q of unopenedQuotes) {
    if (q.contactId) {
      const result = await autoEnroll(q.contactId, "QUOTE_UNOPENED_3DAY", q.id);
      if (result) enrolled++;
    }
  }

  // QUOTE_VIEWED_UNSIGNED_2DAY: viewed 2+ days ago but not signed
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const viewedUnsigned = await prisma.quote.findMany({
    where: {
      status: "VIEWED",
      viewedAt: { lte: twoDaysAgo },
      signedAt: null,
      contactId: { not: null },
    },
    select: { id: true, contactId: true },
  });

  for (const q of viewedUnsigned) {
    if (q.contactId) {
      const result = await autoEnroll(q.contactId, "QUOTE_VIEWED_UNSIGNED_2DAY", q.id);
      if (result) enrolled++;
    }
  }

  // INVOICE_OVERDUE: invoices past due
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: "OVERDUE",
      contactId: { not: null },
    },
    select: { id: true, contactId: true },
  });

  for (const inv of overdueInvoices) {
    if (inv.contactId) {
      const result = await autoEnroll(inv.contactId, "INVOICE_OVERDUE", inv.id);
      if (result) enrolled++;
    }
  }

  // CONTACT_DORMANT_60DAY
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const dormant60 = await prisma.contact.findMany({
    where: {
      isUnsubscribed: false,
      lastActivity: { lte: sixtyDaysAgo },
      stage: { notIn: ["LOST"] },
    },
    select: { id: true },
  });

  for (const c of dormant60) {
    const result = await autoEnroll(c.id, "CONTACT_DORMANT_60DAY");
    if (result) enrolled++;
  }

  return enrolled;
}

// ── Email Tracking ───────────────────────────────────────────

export async function recordOpen(trackingToken: string) {
  const log = await prisma.emailLog.findUnique({ where: { trackingToken } });
  if (!log) return null;

  await prisma.emailLog.update({
    where: { id: log.id },
    data: {
      openedAt: log.openedAt ?? new Date(),
      openCount: { increment: 1 },
    },
  });

  // Update step analytics if part of a sequence
  if (log.enrollmentId && log.stepNumber !== null) {
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: log.enrollmentId },
    });
    if (enrollment) {
      const step = await prisma.sequenceStep.findFirst({
        where: { sequenceId: enrollment.sequenceId, stepNumber: log.stepNumber },
      });
      if (step && !log.openedAt) {
        await prisma.sequenceStep.update({
          where: { id: step.id },
          data: { openCount: { increment: 1 } },
        });
      }
    }
  }

  // Update campaign analytics
  if (log.campaignId && !log.openedAt) {
    await prisma.emailCampaign.update({
      where: { id: log.campaignId },
      data: { openCount: { increment: 1 } },
    });
  }

  return log;
}

export async function recordClick(trackingToken: string) {
  const log = await prisma.emailLog.findUnique({ where: { trackingToken } });
  if (!log) return null;

  await prisma.emailLog.update({
    where: { id: log.id },
    data: {
      clickedAt: log.clickedAt ?? new Date(),
      clickCount: { increment: 1 },
    },
  });

  // Update step analytics if part of a sequence
  if (log.enrollmentId && log.stepNumber !== null) {
    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: log.enrollmentId },
    });
    if (enrollment) {
      const step = await prisma.sequenceStep.findFirst({
        where: { sequenceId: enrollment.sequenceId, stepNumber: log.stepNumber },
      });
      if (step && !log.clickedAt) {
        await prisma.sequenceStep.update({
          where: { id: step.id },
          data: { clickCount: { increment: 1 } },
        });
      }
    }
  }

  if (log.campaignId && !log.clickedAt) {
    await prisma.emailCampaign.update({
      where: { id: log.campaignId },
      data: { clickCount: { increment: 1 } },
    });
  }

  return log;
}

export async function processUnsubscribe(trackingToken: string) {
  const log = await prisma.emailLog.findUnique({
    where: { trackingToken },
    include: { contact: true },
  });
  if (!log) return null;

  // Mark contact as unsubscribed
  await prisma.contact.update({
    where: { id: log.contactId },
    data: { isUnsubscribed: true, unsubscribedAt: new Date() },
  });

  // Create unsubscribe record
  await prisma.unsubscribeRecord.upsert({
    where: { email: log.toEmail },
    create: {
      email: log.toEmail,
      contactId: log.contactId,
      source: log.campaignId ?? log.enrollmentId ?? undefined,
    },
    update: {},
  });

  // Update email log
  await prisma.emailLog.update({
    where: { id: log.id },
    data: { unsubscribedAt: new Date() },
  });

  // Update campaign unsub count
  if (log.campaignId) {
    await prisma.emailCampaign.update({
      where: { id: log.campaignId },
      data: { unsubCount: { increment: 1 } },
    });
  }

  // Unenroll from all active sequences
  const enrollments = await prisma.sequenceEnrollment.findMany({
    where: { contactId: log.contactId, status: "ACTIVE" },
  });
  for (const e of enrollments) {
    await prisma.sequenceEnrollment.update({
      where: { id: e.id },
      data: { status: "UNENROLLED", unenrollReason: "UNSUBSCRIBED", unenrolledAt: new Date() },
    });
  }

  return log;
}

export async function processResubscribe(trackingToken: string) {
  const log = await prisma.emailLog.findUnique({ where: { trackingToken } });
  if (!log) return null;

  await prisma.contact.update({
    where: { id: log.contactId },
    data: { isUnsubscribed: false, unsubscribedAt: null },
  });

  await prisma.unsubscribeRecord.delete({
    where: { email: log.toEmail },
  }).catch(() => {});

  return log;
}

// ── Analytics / Attention Counts ─────────────────────────────

export async function getMarketingAttentionCount(): Promise<number> {
  // Count scheduled campaigns ready to send
  const scheduled = await prisma.emailCampaign.count({
    where: { status: "SCHEDULED" },
  });
  return scheduled;
}

export async function getMarketingDashboardStats() {
  const [activeSequences, enrolledCount, sentThisMonth, allLogs, campaignsSent] = await Promise.all([
    prisma.emailSequence.count({ where: { isActive: true } }),
    prisma.sequenceEnrollment.count({ where: { status: "ACTIVE" } }),
    prisma.emailLog.count({
      where: {
        sentAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    prisma.emailLog.aggregate({
      _count: { id: true },
      _sum: { openCount: true },
      where: {
        sentAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    prisma.emailCampaign.count({ where: { status: "SENT" } }),
  ]);

  const totalSent = allLogs._count.id || 1;
  const totalOpens = allLogs._sum.openCount || 0;
  const avgOpenRate = Math.round((totalOpens / totalSent) * 100);

  return { activeSequences, totalEnrolled: enrolledCount, sentThisMonth, avgOpenRate, campaignsSent };
}

export async function getRecentEmailActivity(limit = 20) {
  return prisma.emailLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      contact: { select: { id: true, name: true } },
      enrollment: {
        select: { sequence: { select: { name: true } } },
      },
      campaign: { select: { name: true } },
    },
  });
}

export async function getSequenceAnalytics(id: string) {
  const sequence = await prisma.emailSequence.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      _count: { select: { enrollments: true } },
    },
  });
  if (!sequence) return null;

  const enrolledCount = await prisma.sequenceEnrollment.count({
    where: { sequenceId: id },
  });
  const completedCount = await prisma.sequenceEnrollment.count({
    where: { sequenceId: id, status: "COMPLETED" },
  });

  const totalSent = sequence.steps.reduce((sum, s) => sum + s.sentCount, 0);
  const totalOpens = sequence.steps.reduce((sum, s) => sum + s.openCount, 0);
  const openRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0;
  const conversionRate = enrolledCount > 0 ? Math.round((completedCount / enrolledCount) * 100) : 0;

  return { sequence, enrolledCount, completedCount, totalSent, openRate, conversionRate };
}

export async function getEnrollmentsForContact(contactId: string) {
  return prisma.sequenceEnrollment.findMany({
    where: { contactId },
    include: {
      sequence: { select: { id: true, name: true, trigger: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getEmailLogsForContact(contactId: string, limit = 20) {
  return prisma.emailLog.findMany({
    where: { contactId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
