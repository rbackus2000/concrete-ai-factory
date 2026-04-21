import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClaudeClient } from "@/lib/claude";
import { collectBriefingData, getDashboardKPIs } from "@/lib/services/reporting-service";
import { sendEmail } from "@/lib/services/postmark-service";

const BRIEFING_SYSTEM_PROMPT = `You are the daily operations assistant for RB Studio (RB Architecture Concrete Studio) — a premium GFRC concrete artistry studio in Anna, Texas, owned by Robert Backus.

RB Studio handcrafts architectural concrete pieces: 13 vessel sink designs (S1 The Erosion through S13 The Sphere), decorative slat wall panels, wall tiles, and custom architectural pieces.

You receive the current business state every morning and generate a concise, actionable daily briefing for the owner, Robert. Your job is to surface what matters most, flag what's urgent, and give one clear recommendation.

Be direct and specific — use actual numbers, customer names, invoice numbers, and order numbers from the data. Never be vague. Never pad the briefing with filler. Every sentence must earn its place.

Format your response in these exact sections:
1. Good Morning Summary (2-3 sentences max)
2. Needs Your Attention Now (bullet list, urgent items only)
3. Production Today (what's buildable, what's blocked)
4. This Week Outlook (forward-looking, 3-4 sentences)
5. One Recommendation (single most impactful action)

Use plain, direct language. No corporate speak. Write like a trusted operations manager who knows the business inside and out.`;

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function getOwnerEmail() {
  return process.env.OWNER_EMAIL ?? "robert@rbstudio.com";
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildDigestEmail(kpis: Awaited<ReturnType<typeof getDashboardKPIs>>, briefingContent: string): string {
  const appUrl = getAppUrl();

  const attentionItems = briefingContent
    .split("\n")
    .filter((line) => line.trim().startsWith("•") || line.trim().startsWith("-"))
    .slice(0, 8)
    .map((line) => `<li style="margin-bottom:6px;">${line.replace(/^[•\-]\s*/, "")}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; background: #f5f5f5; }
    .header { background: #0a0a0a; padding: 24px 32px; }
    .header-text { color: #c8a96e; font-size: 20px; font-weight: 600; letter-spacing: 0.5px; }
    .content { background: #ffffff; max-width: 600px; margin: 0 auto; padding: 32px; }
    .footer { text-align: center; padding: 24px 32px; color: #999; font-size: 12px; background: #0a0a0a; }
    .footer a { color: #c8a96e; }
    .btn { display: inline-block; padding: 12px 28px; background: #c8a96e; color: #0a0a0a; text-decoration: none; font-weight: 600; border-radius: 6px; margin: 4px; }
    .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    h2 { margin: 0 0 16px; color: #0a0a0a; }
    h3 { margin: 16px 0 8px; color: #0a0a0a; font-size: 14px; }
    p { line-height: 1.6; margin: 0 0 12px; }
    .kpi-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .kpi-table td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
    .kpi-table td:first-child { color: #666; }
    .kpi-table td:last-child { text-align: right; font-weight: 600; }
    .red { color: #dc2626; }
    .amber { color: #d97706; }
  </style>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto;">
    <div class="header">
      <span class="header-text">RB Studio</span>
    </div>
    <div class="content">
      <h2>Good morning, Robert.</h2>
      <p style="color:#666; font-size:13px;">Daily Digest — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>

      <hr class="divider">

      <h3>KPI Snapshot</h3>
      <table class="kpi-table">
        <tr><td>Revenue This Month</td><td>${fmtMoney(kpis.revenueThisMonth)}</td></tr>
        <tr><td>Outstanding</td><td>${fmtMoney(kpis.outstanding)} (${kpis.outstandingCount} invoices)</td></tr>
        <tr><td>Overdue</td><td class="${kpis.overdueCount > 0 ? "red" : ""}">${fmtMoney(kpis.overdue)} (${kpis.overdueCount} invoices)</td></tr>
        <tr><td>Active Orders</td><td>${kpis.activeOrders}</td></tr>
        <tr><td>Low Stock Items</td><td class="${kpis.lowStockCount > 0 ? "amber" : ""}">${kpis.lowStockCount}</td></tr>
        <tr><td>Pipeline Value</td><td>${fmtMoney(kpis.pipelineValue)}</td></tr>
      </table>

      ${attentionItems ? `
      <hr class="divider">
      <h3>Needs Attention</h3>
      <ul style="padding-left:20px; margin:0;">
        ${attentionItems}
      </ul>` : ""}

      <hr class="divider">

      <h3>Quick Links</h3>
      <p style="text-align:center;">
        <a href="${appUrl}/dashboard" class="btn">Dashboard</a>
        <a href="${appUrl}/orders" class="btn">Orders</a>
        <a href="${appUrl}/invoices" class="btn">Invoices</a>
      </p>
      <p style="text-align:center;">
        <a href="${appUrl}/inventory" class="btn">Inventory</a>
        <a href="${appUrl}/inventory/reorder" class="btn">Reorder Report</a>
      </p>
    </div>
    <div class="footer">
      <p>This digest was generated at 7:00 AM CT</p>
      <p>RB Architecture Concrete Studio</p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Collect data and generate briefing via Claude
    const briefingData = await collectBriefingData();
    const dataStr = JSON.stringify(briefingData, null, 2);

    const client = getClaudeClient();
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1500,
      system: BRIEFING_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is the current RB Studio business state as of ${briefingData.timestamp}:\n\n${dataStr}`,
        },
      ],
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "";

    // 2. Save to DB
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.dailyBriefing.upsert({
      where: { date: today },
      create: { date: today, content, dataSnapshot: dataStr },
      update: { content, dataSnapshot: dataStr, generatedAt: new Date() },
    });

    // 3. Send digest email
    const kpis = await getDashboardKPIs();
    const emailHtml = buildDigestEmail(kpis, content);

    await sendEmail({
      to: getOwnerEmail(),
      subject: `RB Studio Daily Digest — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      htmlBody: emailHtml,
    });

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate daily briefing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
