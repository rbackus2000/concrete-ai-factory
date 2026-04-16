"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, CornerDownLeft, Loader2, MessageSquarePlus, Trash2 } from "lucide-react";

import {
  createChatSession,
  deleteChatSession,
  getChatSessionMessages,
  listChatSessions,
  saveChatMessage,
  type ChatSessionSummary,
} from "@/app/actions/chat-actions";
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
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const skipNextLoadRef = useRef(false);

  // Load sessions on mount
  useEffect(() => {
    listChatSessions().then((data) => {
      setSessions(data);
      setSessionsLoaded(true);
      // Auto-select the most recent session if one exists
      if (data.length > 0) {
        setActiveSessionId(data[0]!.id);
      }
    });
  }, []);

  // Load messages when active session changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    // Skip loading if we just created this session during submit
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
      return;
    }
    getChatSessionMessages(activeSessionId).then((data) => {
      setMessages(
        data.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          toolCalls: m.toolCalls ?? undefined,
        })),
      );
    });
  }, [activeSessionId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => { inputRef.current?.focus(); }, [activeSessionId]);

  async function ensureSession(): Promise<string> {
    if (activeSessionId) return activeSessionId;
    const { id } = await createChatSession();
    skipNextLoadRef.current = true;
    setActiveSessionId(id);
    return id;
  }

  async function refreshSessions() {
    const data = await listChatSessions();
    setSessions(data);
  }

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const sessionId = await ensureSession();

    const userMessage: Message = { id: generateId(), role: "user", content: trimmed };
    const assistantMessage: Message = { id: generateId(), role: "assistant", content: "", toolCalls: [] };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsLoading(true);

    // Save user message to DB
    await saveChatMessage({ sessionId, role: "user", content: trimmed });
    // Refresh sidebar to show updated title
    refreshSessions();

    const conversationHistory = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: trimmed },
    ];

    let fullAssistantContent = "";
    let finalToolCalls: { name: string; status: string }[] = [];

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
        const errorContent = `Error: ${errorText || response.statusText}`;
        setMessages((prev) => prev.map((m) => m.id === assistantMessage.id ? { ...m, content: errorContent } : m));
        fullAssistantContent = errorContent;
        setIsLoading(false);
        await saveChatMessage({ sessionId, role: "assistant", content: fullAssistantContent });
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
            fullAssistantContent += event.text;
            setMessages((prev) => prev.map((m) => m.id === assistantMessage.id ? { ...m, content: m.content + event.text } : m));
          }
          if (event.type === "tool_start" && event.name) {
            finalToolCalls.push({ name: event.name, status: "executing" });
            setMessages((prev) => prev.map((m) => m.id === assistantMessage.id ? { ...m, toolCalls: [...(m.toolCalls ?? []), { name: event.name!, status: "executing" as const }] } : m));
          }
          if (event.type === "tool_done" && event.name) {
            finalToolCalls = finalToolCalls.map((tc) => tc.name === event.name ? { ...tc, status: "done" } : tc);
            setMessages((prev) => prev.map((m) => m.id === assistantMessage.id ? { ...m, toolCalls: (m.toolCalls ?? []).map((tc) => tc.name === event.name ? { ...tc, status: "done" as const } : tc) } : m));
          }
          if (event.type === "error") {
            fullAssistantContent += `\n\nError: ${event.error}`;
            setMessages((prev) => prev.map((m) => m.id === assistantMessage.id ? { ...m, content: m.content + `\n\nError: ${event.error}` } : m));
          }
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        const errorMessage = error instanceof Error ? error.message : "Request failed.";
        fullAssistantContent = `Error: ${errorMessage}`;
        setMessages((prev) => prev.map((m) => m.id === assistantMessage.id ? { ...m, content: `Error: ${errorMessage}` } : m));
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      inputRef.current?.focus();

      // Save assistant message to DB
      if (fullAssistantContent) {
        await saveChatMessage({
          sessionId,
          role: "assistant",
          content: fullAssistantContent,
          toolCalls: finalToolCalls.length > 0 ? finalToolCalls : null,
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, isLoading, messages, activeSessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  async function handleNewChat() {
    const { id } = await createChatSession();
    setActiveSessionId(id);
    setMessages([]);
    setInput("");
    await refreshSessions();
    inputRef.current?.focus();
  }

  async function handleDeleteSession(sessionId: string) {
    await deleteChatSession(sessionId);
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setMessages([]);
    }
    await refreshSessions();
  }

  function handleSelectSession(sessionId: string) {
    if (sessionId === activeSessionId) return;
    setActiveSessionId(sessionId);
    setInput("");
  }

  if (!sessionsLoaded) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      {/* Session Sidebar */}
      <div className="flex w-64 shrink-0 flex-col border-r border-border bg-muted/30">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Chats</h3>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {sessions.length === 0 && (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              No conversations yet
            </p>
          )}
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                session.id === activeSessionId
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
              onClick={() => handleSelectSession(session.id)}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{session.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {session.messageCount} messages
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }}
                className="shrink-0 rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-background hover:text-destructive transition-all"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col">
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
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto py-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary">
                <Bot className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">What are we building?</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  I can design new products, generate images, create build packets, calculate mold specs, and look up anything in your factory database.
                </p>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[
                  "Show me all active SKUs",
                  "Design me a new vessel sink",
                  "What are the mold specs for S1-EROSION?",
                  "Generate a build packet for S4-FACET",
                ].map((suggestion) => (
                  <button key={suggestion} onClick={() => setInput(suggestion)}
                    className="rounded-lg border border-border bg-card px-4 py-2.5 text-left text-xs text-muted-foreground hover:border-zinc-300 hover:bg-muted hover:text-foreground transition-colors">
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
              placeholder="Ask about SKUs, design new products, generate outputs, or plan 3D molds..."
              rows={1} className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm text-foreground placeholder-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-ring/30 transition-colors"
              style={{ minHeight: "44px", maxHeight: "160px", height: "auto" }}
              onInput={(e) => { const target = e.target as HTMLTextAreaElement; target.style.height = "auto"; target.style.height = `${Math.min(target.scrollHeight, 160)}px`; }} />
            <button type="submit" disabled={!input.trim() || isLoading}
              className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:hover:bg-primary transition-colors">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CornerDownLeft className="h-4 w-4" />}
            </button>
          </form>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">Jacob can design products, generate images, and query your database. Shift+Enter for new line.</p>
        </div>
      </div>
    </div>
  );
}
