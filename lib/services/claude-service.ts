const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

type ClaudeMessage = {
  role: "user" | "assistant";
  content: string;
};

type ClaudeResponse = {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: string; text?: string }>;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
};

export async function callClaude({
  systemPrompt,
  messages,
  maxTokens = 8192,
  temperature = 0.3,
}: {
  systemPrompt: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<{ text: string; usage: { input: number; output: number } }> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured. Set it in .env.local");
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as ClaudeResponse;
  const text = data.content
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text!)
    .join("");

  return {
    text,
    usage: {
      input: data.usage.input_tokens,
      output: data.usage.output_tokens,
    },
  };
}

export async function callClaudeForJson<T>({
  systemPrompt,
  userPrompt,
  maxTokens = 8192,
}: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}): Promise<{ data: T; usage: { input: number; output: number } }> {
  const result = await callClaude({
    systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens,
    temperature: 0.2,
  });

  // Extract JSON from response — handle markdown code fences
  let jsonText = result.text.trim();
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonText = fenceMatch[1]!.trim();
  }

  // Also try extracting first { ... } block if raw text wraps the JSON
  if (!jsonText.startsWith("{") && !jsonText.startsWith("[")) {
    const braceMatch = jsonText.match(/(\{[\s\S]*\})/);
    if (braceMatch) {
      jsonText = braceMatch[1]!;
    }
  }

  try {
    const data = JSON.parse(jsonText) as T;
    return { data, usage: result.usage };
  } catch (parseErr) {
    console.error("[Claude] Failed to parse JSON response. First 500 chars:", jsonText.substring(0, 500));
    throw new Error(`Claude returned invalid JSON. Response starts with: "${jsonText.substring(0, 100)}..."`);
  }
}
