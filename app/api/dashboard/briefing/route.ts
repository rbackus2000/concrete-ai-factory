import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClaudeClient } from "@/lib/claude";
import { collectBriefingData } from "@/lib/services/reporting-service";

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

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const refresh = request.nextUrl.searchParams.get("refresh") === "true";

  try {
    if (!refresh) {
      // Check for today's briefing
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existing = await prisma.dailyBriefing.findUnique({
        where: { date: today },
      });

      if (existing) {
        return NextResponse.json({
          data: {
            content: existing.content,
            generatedAt: existing.generatedAt.toISOString(),
          },
        });
      }
    }

    // No cached briefing or refresh requested — need to generate
    return NextResponse.json({
      data: { content: null, generatedAt: null, needsGeneration: true },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch briefing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const briefingData = await collectBriefingData();
    const dataStr = JSON.stringify(briefingData, null, 2);

    const client = getClaudeClient();

    const stream = await client.messages.stream({
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

    let fullContent = "";
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullContent += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        // Save to DB
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await prisma.dailyBriefing.upsert({
          where: { date: today },
          create: { date: today, content: fullContent, dataSnapshot: dataStr },
          update: { content: fullContent, dataSnapshot: dataStr, generatedAt: new Date() },
        });

        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate briefing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
