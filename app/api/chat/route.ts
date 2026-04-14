/**
 * /api/chat — Streaming chat endpoint for the Jacob agent.
 * Calls Anthropic Claude API with tools, executes tool calls against Prisma,
 * and streams the final response back to the client via SSE.
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/shared";
import { JACOB_SYSTEM_PROMPT } from "@/lib/agent/system-prompt";
import { AGENT_TOOLS } from "@/lib/agent/tools";
import { executeAgentTool } from "@/lib/services/agent-service";

type ChatMessage = {
  role: "user" | "assistant";
  content: string | ContentBlock[];
};

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

type AnthropicStreamEvent = {
  type: string;
  index?: number;
  delta?: { type?: string; text?: string; partial_json?: string; stop_reason?: string };
  content_block?: { type: string; id?: string; name?: string; text?: string; input?: Record<string, unknown> };
  message?: { stop_reason?: string; content?: ContentBlock[] };
};

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

function getApiKey() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY environment variable is required.");
  return key;
}

function streamClaude(messages: ChatMessage[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const response = await fetch(ANTHROPIC_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": getApiKey(),
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: 4096,
            stream: true,
            system: JACOB_SYSTEM_PROMPT,
            tools: AGENT_TOOLS,
            messages,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: errorBody })}\n\n`));
          controller.close();
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) { controller.close(); return; }

        const decoder = new TextDecoder();
        let buffer = "";
        const currentToolUseBlocks: ContentBlock[] = [];
        let toolInputJsonBuffer = "";
        let currentToolBlockId = "";
        let currentToolBlockName = "";
        let hasToolUse = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            let event: AnthropicStreamEvent;
            try { event = JSON.parse(data); } catch { continue; }

            if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
              hasToolUse = true;
              currentToolBlockId = event.content_block.id ?? "";
              currentToolBlockName = event.content_block.name ?? "";
              toolInputJsonBuffer = "";
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_start", name: currentToolBlockName })}\n\n`));
            }

            if (event.type === "content_block_delta") {
              if (event.delta?.type === "text_delta" && event.delta.text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`));
              }
              if (event.delta?.type === "input_json_delta" && event.delta.partial_json) {
                toolInputJsonBuffer += event.delta.partial_json;
              }
            }

            if (event.type === "content_block_stop" && hasToolUse && currentToolBlockId) {
              let parsedInput: Record<string, unknown> = {};
              try { parsedInput = toolInputJsonBuffer ? JSON.parse(toolInputJsonBuffer) : {}; } catch { parsedInput = {}; }
              currentToolUseBlocks.push({ type: "tool_use", id: currentToolBlockId, name: currentToolBlockName, input: parsedInput });
              currentToolBlockId = "";
              currentToolBlockName = "";
              toolInputJsonBuffer = "";
            }

            if (event.type === "message_stop" || event.type === "message_delta") {
              const stopReason = event.type === "message_delta" ? event.delta?.stop_reason : undefined;

              if ((stopReason === "tool_use" || hasToolUse) && currentToolUseBlocks.length > 0) {
                const toolResults: ContentBlock[] = [];

                for (const block of currentToolUseBlocks) {
                  if (block.type !== "tool_use") continue;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_executing", name: block.name })}\n\n`));
                  const { result, error } = await executeAgentTool(block.name, block.input);
                  const content = error ? JSON.stringify({ error }) : JSON.stringify(result);
                  toolResults.push({ type: "tool_result", tool_use_id: block.id, content });
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_done", name: block.name })}\n\n`));
                }

                const continuationMessages: ChatMessage[] = [
                  ...messages,
                  { role: "assistant", content: currentToolUseBlocks },
                  { role: "user", content: toolResults },
                ];

                reader.cancel();

                const continuationStream = await fetch(ANTHROPIC_API_URL, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-api-key": getApiKey(),
                    "anthropic-version": "2023-06-01",
                  },
                  body: JSON.stringify({
                    model: MODEL, max_tokens: 4096, stream: true,
                    system: JACOB_SYSTEM_PROMPT, tools: AGENT_TOOLS,
                    messages: continuationMessages,
                  }),
                });

                if (!continuationStream.ok) {
                  const errorBody = await continuationStream.text();
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: errorBody })}\n\n`));
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  controller.close();
                  return;
                }

                const contReader = continuationStream.body?.getReader();
                if (!contReader) { controller.enqueue(encoder.encode("data: [DONE]\n\n")); controller.close(); return; }

                let contBuffer = "";
                while (true) {
                  const { done: contDone, value: contValue } = await contReader.read();
                  if (contDone) break;
                  contBuffer += decoder.decode(contValue, { stream: true });
                  const contLines = contBuffer.split("\n");
                  contBuffer = contLines.pop() ?? "";

                  for (const contLine of contLines) {
                    if (!contLine.startsWith("data: ")) continue;
                    const contData = contLine.slice(6).trim();
                    if (contData === "[DONE]") continue;
                    let contEvent: AnthropicStreamEvent;
                    try { contEvent = JSON.parse(contData); } catch { continue; }
                    if (contEvent.type === "content_block_delta" && contEvent.delta?.type === "text_delta" && contEvent.delta.text) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text: contEvent.delta.text })}\n\n`));
                    }
                  }
                }

                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
                return;
              }
            }
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Stream failed.";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`));
        controller.close();
      }
    },
  });
}

export async function POST(request: NextRequest) {
  const session = authenticateRequest(request.headers.get("authorization"));
  if (!session) {
    return new NextResponse("Authentication required.", {
      status: 401, headers: { "WWW-Authenticate": 'Basic realm="Concrete AI Factory"' },
    });
  }

  let body: { messages: ChatMessage[] };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "Messages array is required." }, { status: 400 });
  }

  const messages: ChatMessage[] = body.messages.map((m) => ({ role: m.role, content: m.content }));

  try {
    const stream = streamClaude(messages);
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
