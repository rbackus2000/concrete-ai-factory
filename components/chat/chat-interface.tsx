"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, CornerDownLeft, Loader2, Trash2 } from "lucide-react";
import ChatMessage from "./chat-message";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: { name: string; status: "executing" | "done" }[];
};

type StreamEvent = {
  type: "text" | "tool_start" | "tool_executing" | "tool_done" | "error";
  text?: string;
  name?: string;
  error?: string;
};

function generateId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { id: generateId(), role: "user", content: trimmed };
    const assistantMessage: Message = { id: generateId(), role: "assistant", content: "", toolCalls: [] };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsLoading(true);

    const conversationHistory = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: trimmed },
    ];

    try {
      abortRef.current = new AbortController();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversationHistory }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        setMessages((prev) => prev.map((m) => m.id === assistantMessage.id ? { ...m, content: `Error: ${errorText || response.statusText}` } : m));
        setIsLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) { setIsLoading(false); return; }

      const decoder = new TextDecoder();
      let buffer = "";

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

          let event: StreamEvent;
          try { event = JSON.parse(data); } catch { continue; }

          if (event.type === "text" && event.text) {
            setMessages((prev) => prev.map((m) => m.id === assistantMessage.id ? { ...m, content: m.content + event.text } : m));
          }
          if (event.type === "tool_start" && event.name) {
            setMessages((prev) => prev.map((m) => m.id === assistantMessage.id ? { ...m, toolCalls: [...(m.toolCalls ?? []), { name: event.name!, status: "executing" as const }] } : m));
          }
          if (event.type === "tool_done" && event.name) {
            setMessages((prev) => prev.map((m) => m.id === assistantMessage.id ? { ...m, toolCalls: (m.toolCalls ?? []).map((tc) => tc.name === event.name ? { ...tc, status: "done" as const } : tc) } : m));
          }
          if (event.type === "error") {
            setMessages((prev) => prev.map((m) => m.id === assistantMessage.id ? { ...m, content: m.content + `\n\nError: ${event.error}` } : m));
          }
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        const errorMessage = error instanceof Error ? error.message : "Request failed.";
        setMessages((prev) => prev.map((m) => m.id === assistantMessage.id ? { ...m, content: `Error: ${errorMessage}` } : m));
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, [input, isLoading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const clearChat = () => { setMessages([]); setInput(""); inputRef.current?.focus(); };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Jacob</h2>
            <p className="text-xs text-muted-foreground">AI Operations Partner</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Trash2 className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary">
              <Bot className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">What are we building?</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">I know the codebase, the products, the mixes, and the specs. Ask me anything about your SKUs, manufacturing rules, costs, slat wall projects, or equipment status.</p>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {["Show me all active SKUs", "What are the specs on S1-EROSION?", "What manufacturing rules do we have?", "Give me the dashboard metrics"].map((suggestion) => (
                <button key={suggestion} onClick={() => { setInput(suggestion); }} className="rounded-lg border border-border bg-card px-4 py-2.5 text-left text-xs text-muted-foreground hover:border-zinc-300 hover:bg-muted hover:text-foreground transition-colors">
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <ChatMessage key={message.id} role={message.role} content={message.content} toolCalls={message.toolCalls}
            isStreaming={isLoading && message.role === "assistant" && index === messages.length - 1} />
        ))}

        {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === "assistant" && messages[messages.length - 1]?.content === "" && (messages[messages.length - 1]?.toolCalls?.length ?? 0) === 0 && (
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Thinking...</div>
        )}
      </div>

      <div className="border-t border-border px-4 py-3">
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Ask about SKUs, specs, rules, costs, or anything in the factory..."
            rows={1} className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm text-foreground placeholder-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-ring/30 transition-colors"
            style={{ minHeight: "44px", maxHeight: "160px", height: "auto" }}
            onInput={(e) => { const target = e.target as HTMLTextAreaElement; target.style.height = "auto"; target.style.height = `${Math.min(target.scrollHeight, 160)}px`; }} />
          <button type="submit" disabled={!input.trim() || isLoading}
            className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:hover:bg-primary transition-colors">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CornerDownLeft className="h-4 w-4" />}
          </button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">Jacob has access to your database. Shift+Enter for new line.</p>
      </div>
    </div>
  );
}
