import { NextRequest } from "next/server";
import { generateEmailSchema } from "@/lib/schemas/marketing";
import { getClaudeClient, RB_STUDIO_SYSTEM_PROMPT } from "@/lib/claude";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = generateEmailSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Validation failed" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const data = parsed.data;
  let userPrompt = "";

  if (data.type === "sequence_step") {
    const prevSteps = data.previousSteps?.length
      ? `Previous steps in sequence: ${data.previousSteps.join(", ")}`
      : "This is the first step in the sequence.";

    userPrompt = `Write email step ${data.stepNumber ?? 1} of "${data.sequenceName ?? "Email Sequence"}".
This email sends ${data.delayDays ?? 0} days after ${data.triggerEvent ?? "trigger"}.
Tone: ${data.tone ?? "friendly"}.
${data.subject ? `Subject line: ${data.subject}` : "Also write a subject line."}
${prevSteps}
Write the email body in HTML. Use [contactName] as a personalization token where appropriate. Keep it under 150 words. No fluff. End with one clear call to action.
Return ONLY the HTML body, no markdown code fences.`;
  } else if (data.type === "campaign") {
    userPrompt = `Write a broadcast email campaign for RB Studio.
Campaign goal: ${data.campaignName ?? "General campaign"}
Audience: ${data.segmentDescription ?? "All contacts"}
Tone: ${data.tone ?? "friendly"}
Keep it under 200 words. Write in HTML. Use [contactName] as a personalization token. End with one clear call to action.
Return ONLY the HTML body, no markdown code fences.`;
  } else if (data.type === "subject_improve") {
    userPrompt = `Improve this email subject line for higher open rates.
Current: ${data.subject ?? ""}
Context: ${data.context ?? "RB Studio marketing email"}
Return only the improved subject line, nothing else.`;
  }

  try {
    const client = getClaudeClient();

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: RB_STUDIO_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
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
