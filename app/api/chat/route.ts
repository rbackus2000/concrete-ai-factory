/**
 * /api/chat — Streaming chat endpoint for the Jacob agent.
 * Calls Anthropic Claude API with tools, executes tool calls against Prisma,
 * and streams the final response back to the client via SSE.
 * Supports multi-round tool execution (Claude can call tools multiple times).
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
const MAX_TOOL_ROUNDS = 5;

function getApiKey() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY environment variable is required.");
  return key;
}

async function callClaudeStreaming(messages: ChatMessage[]): Promise<Response> {
  return fetch(ANTHROPIC_API_URL, {
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
}

/**
 * Reads a streaming Claude response. Returns any tool_use blocks found.
 * Text deltas are forwarded to the SSE controller in real time.
 */
async function readClaudeStream(
  response: Response,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
): Promise<{ toolUseBlocks: ContentBlock[]; textBlocks: ContentBlock[] }> {
  const reader = response.body?.getReader();
  if (!reader) return { toolUseBlocks: [], textBlocks: [] };

  const decoder = new TextDecoder();
  let buffer = "";
  const toolUseBlocks: ContentBlock[] = [];
  const textBlocks: ContentBlock[] = [];
  let currentToolBlockId = "";
  let currentToolBlockName = "";
  let toolInputJsonBuffer = "";
  let fullText = "";

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

      // Text content
      if (event.type === "content_block_start" && event.content_block?.type === "text") {
        // text block starting
      }
      if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
        fullText += event.delta.text;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`));
      }

      // Tool use
      if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
        currentToolBlockId = event.content_block.id ?? "";
        currentToolBlockName = event.content_block.name ?? "";
        toolInputJsonBuffer = "";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_start", name: currentToolBlockName })}\n\n`));
      }
      if (event.type === "content_block_delta" && event.delta?.type === "input_json_delta" && event.delta.partial_json) {
        toolInputJsonBuffer += event.delta.partial_json;
      }
      if (event.type === "content_block_stop" && currentToolBlockId) {
        let parsedInput: Record<string, unknown> = {};
        try { parsedInput = toolInputJsonBuffer ? JSON.parse(toolInputJsonBuffer) : {}; } catch { /* empty */ }
        toolUseBlocks.push({ type: "tool_use", id: currentToolBlockId, name: currentToolBlockName, input: parsedInput });
        currentToolBlockId = "";
        currentToolBlockName = "";
        toolInputJsonBuffer = "";
      }
    }
  }

  if (fullText) {
    textBlocks.push({ type: "text", text: fullText });
  }

  return { toolUseBlocks, textBlocks };
}

function streamClaude(messages: ChatMessage[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        let currentMessages = [...messages];
        let round = 0;

        while (round < MAX_TOOL_ROUNDS) {
          round++;

          const response = await callClaudeStreaming(currentMessages);
          if (!response.ok) {
            const errorBody = await response.text();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: errorBody })}\n\n`));
            break;
          }

          const { toolUseBlocks, textBlocks } = await readClaudeStream(response, controller, encoder);

          // No tool calls — we're done
          if (toolUseBlocks.length === 0) break;

          // Execute tool calls
          const toolResults: ContentBlock[] = [];
          for (const block of toolUseBlocks) {
            if (block.type !== "tool_use") continue;

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_executing", name: block.name })}\n\n`));

            // Send keepalive pings during long tool executions
            const keepalive = setInterval(() => {
              controller.enqueue(encoder.encode(`: keepalive\n\n`));
            }, 10000);

            try {
              const { result, error } = await executeAgentTool(block.name, block.input);
              const content = error ? JSON.stringify({ error }) : JSON.stringify(result);
              toolResults.push({ type: "tool_result", tool_use_id: block.id, content });
            } finally {
              clearInterval(keepalive);
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_done", name: block.name })}\n\n`));
          }

          // Build continuation messages with assistant's response + tool results
          const assistantContent: ContentBlock[] = [...textBlocks, ...toolUseBlocks];
          currentMessages = [
            ...currentMessages,
            { role: "assistant", content: assistantContent },
            { role: "user", content: toolResults },
          ];
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Stream failed.";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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
