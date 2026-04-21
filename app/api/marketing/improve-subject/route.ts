import { NextRequest } from "next/server";
import { getClaudeClient, RB_STUDIO_SYSTEM_PROMPT } from "@/lib/claude";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { subject, context } = body as { subject?: string; context?: string };

  if (!subject) {
    return new Response(JSON.stringify({ error: "Subject is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const client = getClaudeClient();

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 256,
      system: RB_STUDIO_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Improve this email subject line for higher open rates.\nCurrent: ${subject}\nContext: ${context ?? "RB Studio marketing email"}\nReturn only the improved subject line, nothing else.`,
        },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
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
    const message = err instanceof Error ? err.message : "AI generation failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
