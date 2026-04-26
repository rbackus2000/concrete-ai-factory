import { prisma } from "@/lib/db";
import { getClaudeClient } from "@/lib/claude";

// Sonnet 4.6 input pricing: $3/M input, $15/M output. Web search: $10/1k searches.
const PRICE_INPUT_PER_M = 3;
const PRICE_OUTPUT_PER_M = 15;
const PRICE_PER_WEB_SEARCH = 0.01;

// The full system prompt Robert specified — Jacob the product/market
// intelligence agent. Output structure is fixed and parsed downstream.
const INTEL_SYSTEM_PROMPT = `You are a product and market intelligence agent for a high-end architectural concrete studio. The company designs and manufactures:
- Residential: sinks, vanities, wall panels, furniture
- Commercial: bar tops, reception desks, feature walls, corporate interiors
- Outdoor: tables, benches, planters, architectural elements

Your objectives:
1. Identify emerging product trends
2. Detect products gaining real traction
3. Analyze competitors (products, pricing signals, positioning)
4. Track fabrication and manufacturing innovations
5. Identify scalable, profitable product opportunities

Segment all analysis into:
- Residential
- Commercial
- Outdoor

For each product or trend, evaluate:
- Market demand
- Visual/design appeal
- Production complexity
- Shipping/logistics complexity
- Durability requirements
- Profit potential
- Repeatability (custom vs scalable)

Output EXACTLY in this structure (use markdown, with H2 \`##\` for each numbered section):

## 1. Executive Summary
(5 bullets max)

## 2. Residential Insights
### Trends
### Products gaining traction
### Opportunities
(opportunities should be a markdown table with columns: Opportunity | Market demand | Visual appeal | Production complexity | Shipping/logistics | Durability requirements | Profit potential | Repeatability)

## 3. Commercial Insights
(same shape as Residential)

## 4. Outdoor Insights
(same shape as Residential)

## 5. Competitor Intelligence
(markdown table: Company / Brand | Product focus | Price positioning | Key takeaway)

## 6. Fabrication & Manufacturing Insights
### New techniques
### Efficiency improvements
### Risk factors

## 7. Product Opportunity Scorecard (Top 5 ideas)
(markdown table: Product Idea | Demand (1-10) | Margin Potential | Difficulty | Scalability | Risk | Rationale)

## 8. Top 3 Products to Prototype Immediately
For each:
- Description
- Why it matters
- Target customer

## 9. Sales & Positioning Angles
How to sell these products. Who to target.

## 10. Risks / What to Avoid

Rules:
- No generic statements — every claim must be specific and tied to current market signals
- No structural concrete topics (no foundations, no slabs, no civil engineering)
- Focus on architectural products only
- Prioritize actionable insights
- Use real company names, real product names, real price points wherever possible
- When citing prices, name the source (retailer, listing, MSRP)
- Use the web_search tool aggressively — at least 15-25 distinct searches per report
- Cover residential, commercial, and outdoor segments evenly

Format:
- Use markdown headings, bullet lists, and tables exactly as described
- Do not include preamble like "Here is the report" — start directly with \`## 1. Executive Summary\`
- Tables must use proper markdown pipe syntax with header row + separator row`;

function startOfWeekMonday(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  const dow = out.getUTCDay(); // 0 = Sunday
  const diff = dow === 0 ? -6 : 1 - dow;
  out.setUTCDate(out.getUTCDate() + diff);
  return out;
}

function extractExecutiveSummary(markdown: string): string {
  // Pull section 1 from the markdown — everything between "## 1." and "## 2.".
  const match = markdown.match(/##\s*1\.\s*Executive Summary([\s\S]*?)(?=^##\s*2\.|$)/m);
  if (!match) return "";
  return match[1].trim();
}

function extractTopProducts(markdown: string): { title: string; description: string }[] {
  // Pull section 8 (Top 3 Products to Prototype Immediately).
  const match = markdown.match(/##\s*8\.\s*Top 3 Products[^\n]*\n([\s\S]*?)(?=^##\s*9\.|$)/m);
  if (!match) return [];
  const body = match[1];
  // Each product is a numbered list item or a bolded line.
  const items: { title: string; description: string }[] = [];
  const blocks = body.split(/\n(?=\d+\.\s|^\*\*|^- \*\*)/m);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const titleMatch = trimmed.match(/^(?:\d+\.\s+|[-*]\s+)?\**([^\n*]+?)\**\s*[—–-]/);
    const title = titleMatch?.[1]?.trim() ?? trimmed.split("\n")[0].slice(0, 100);
    items.push({ title, description: trimmed.slice(0, 800) });
  }
  return items.slice(0, 3);
}

export type GenerateIntelReportResult = {
  reportId: string;
  weekOf: Date;
  inputTokens: number;
  outputTokens: number;
  webSearches: number;
  estimatedCostUsd: number;
};

/**
 * Generates this week's market intelligence report via Claude Sonnet 4.6
 * with the web_search tool. Persists the report to the database (upsert
 * by weekOf, so re-running on the same Monday updates rather than
 * duplicates). Returns the saved report id and cost metrics.
 */
export async function generateIntelReport(now: Date = new Date()): Promise<GenerateIntelReportResult> {
  const weekOf = startOfWeekMonday(now);
  const weekLabel = weekOf.toISOString().slice(0, 10);
  const model = "claude-sonnet-4-6";

  const client = getClaudeClient();
  const userPrompt = `Today is ${now.toISOString().slice(0, 10)}. Generate the weekly architectural concrete market intelligence report for the week of ${weekLabel}.

Use the web_search tool to gather real, current data: scan retailer sites (CB2, West Elm, Trueform Concrete, Stone Forest, Gore Design, ModaConcrete, Kast, Concrete Collaborative), trade publications (Architectural Record, Wallpaper, Dezeen, Dwell, Interior Design Magazine), and design news for the past 7 days where possible.

Cover all three segments — residential, commercial, outdoor — with equal depth. Cite specific product names, current price points, and the source where the price was found.`;

  // Type as any because the Anthropic TS SDK types lag behind the API
  // for newly-released tools (web_search). The runtime accepts it.
  const tools: any[] = [
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 30,
    },
  ];

  const response: any = await client.messages.create({
    model,
    max_tokens: 16000,
    system: INTEL_SYSTEM_PROMPT,
    tools,
    messages: [{ role: "user", content: userPrompt }],
  });

  // Concatenate all text blocks. Tool-use blocks are interleaved; we only
  // want the assistant's text output.
  const textBlocks = (response.content ?? [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text as string);
  const fullMarkdown = textBlocks.join("\n\n").trim();

  if (!fullMarkdown) {
    throw new Error("Claude returned no text content");
  }

  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;
  const webSearches = (response.usage?.server_tool_use?.web_search_requests as number | undefined) ?? 0;
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * PRICE_INPUT_PER_M +
    (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_M +
    webSearches * PRICE_PER_WEB_SEARCH;

  const executiveSummary = extractExecutiveSummary(fullMarkdown);
  const topProducts = extractTopProducts(fullMarkdown);

  const saved = await prisma.intelligenceReport.upsert({
    where: { weekOf },
    create: {
      weekOf,
      executiveSummary,
      fullMarkdown,
      topProductsJson: topProducts,
      status: "PUBLISHED",
      model,
      inputTokens,
      outputTokens,
      estimatedCostUsd,
    },
    update: {
      executiveSummary,
      fullMarkdown,
      topProductsJson: topProducts,
      status: "PUBLISHED",
      model,
      inputTokens,
      outputTokens,
      estimatedCostUsd,
      generatedAt: new Date(),
      errorMessage: null,
    },
  });

  return {
    reportId: saved.id,
    weekOf,
    inputTokens,
    outputTokens,
    webSearches,
    estimatedCostUsd,
  };
}

export async function getLatestIntelReport() {
  return prisma.intelligenceReport.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { weekOf: "desc" },
  });
}

export async function listIntelReports(limit = 52) {
  return prisma.intelligenceReport.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { weekOf: "desc" },
    take: limit,
    select: {
      id: true,
      weekOf: true,
      generatedAt: true,
      executiveSummary: true,
      model: true,
      estimatedCostUsd: true,
    },
  });
}

export async function getIntelReportById(id: string) {
  return prisma.intelligenceReport.findUnique({ where: { id } });
}

/**
 * Sums total spend across the current calendar month. Used by the cron
 * to enforce the monthly budget cap before kicking off another run.
 */
export async function intelReportSpendThisMonth(): Promise<number> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const reports = await prisma.intelligenceReport.findMany({
    where: { generatedAt: { gte: monthStart } },
    select: { estimatedCostUsd: true },
  });
  return reports.reduce((sum, r) => sum + Number(r.estimatedCostUsd ?? 0), 0);
}
