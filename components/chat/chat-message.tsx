"use client";

import { Bot, User, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
  toolCalls?: { name: string; status: "executing" | "done" }[];
  isStreaming?: boolean;
};

function formatToolName(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ChatMessage({ role, content, toolCalls, isStreaming }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3 px-4 py-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        isUser ? "bg-zinc-200 text-zinc-700" : "bg-primary text-primary-foreground",
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn("flex max-w-[80%] flex-col gap-2", isUser ? "items-end" : "items-start")}>
        {toolCalls && toolCalls.length > 0 && (
          <div className="flex flex-col gap-1">
            {toolCalls.map((tool, i) => (
              <div key={`${tool.name}-${i}`} className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs",
                tool.status === "executing"
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-border bg-muted text-muted-foreground",
              )}>
                <Wrench className="h-3 w-3" />
                <span>{formatToolName(tool.name)}</span>
                {tool.status === "executing" && <span className="animate-pulse">&#x25CF;</span>}
                {tool.status === "done" && <span className="text-green-600">&#x2713;</span>}
              </div>
            ))}
          </div>
        )}

        {content && (
          <div className={cn(
            "rounded-xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card text-card-foreground border border-border",
          )}>
            <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:mb-1 prose-headings:mt-3 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:my-2 prose-pre:bg-zinc-100 prose-code:text-primary prose-strong:text-foreground">
              <MessageContent content={content} />
            </div>
            {isStreaming && <span className="inline-block h-4 w-1 animate-pulse bg-primary ml-0.5 align-middle" />}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith("```")) { codeLines.push(lines[i]!); i++; }
      i++;
      elements.push(<pre key={elements.length} className="rounded bg-zinc-100 p-3 text-xs overflow-x-auto"><code>{codeLines.join("\n")}</code></pre>);
      continue;
    }

    if (line.startsWith("### ")) { elements.push(<h3 key={elements.length}>{formatInline(line.slice(4))}</h3>); i++; continue; }
    if (line.startsWith("## ")) { elements.push(<h2 key={elements.length}>{formatInline(line.slice(3))}</h2>); i++; continue; }
    if (line.startsWith("# ")) { elements.push(<h1 key={elements.length}>{formatInline(line.slice(2))}</h1>); i++; continue; }

    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i]!.includes("|") && lines[i]!.trim().startsWith("|")) { tableLines.push(lines[i]!); i++; }
      elements.push(<SimpleTable key={elements.length} lines={tableLines} />);
      continue;
    }

    if (line.match(/^\s*[-*]\s/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i]!.match(/^\s*[-*]\s/)) { listItems.push(lines[i]!.replace(/^\s*[-*]\s/, "")); i++; }
      elements.push(<ul key={elements.length}>{listItems.map((item, idx) => <li key={idx}>{formatInline(item)}</li>)}</ul>);
      continue;
    }

    if (line.match(/^\s*\d+\.\s/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i]!.match(/^\s*\d+\.\s/)) { listItems.push(lines[i]!.replace(/^\s*\d+\.\s/, "")); i++; }
      elements.push(<ol key={elements.length}>{listItems.map((item, idx) => <li key={idx}>{formatInline(item)}</li>)}</ol>);
      continue;
    }

    if (line.trim() === "") { i++; continue; }
    elements.push(<p key={elements.length}>{formatInline(line)}</p>);
    i++;
  }

  return <>{elements}</>;
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="rounded bg-zinc-100 px-1 py-0.5 text-xs text-primary">{part.slice(1, -1)}</code>;
    return part;
  });
}

function SimpleTable({ lines }: { lines: string[] }) {
  const parseRow = (line: string) => line.split("|").slice(1, -1).map((cell) => cell.trim());
  const headers = lines[0] ? parseRow(lines[0]) : [];
  const bodyRows = lines.slice(2).map(parseRow);

  return (
    <table>
      <thead><tr>{headers.map((h, i) => <th key={i}>{formatInline(h)}</th>)}</tr></thead>
      <tbody>{bodyRows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{formatInline(cell)}</td>)}</tr>)}</tbody>
    </table>
  );
}
