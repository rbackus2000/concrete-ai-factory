"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Renders Claude-generated briefing content as structured HTML.
 * This content is exclusively produced by our server-side Claude API call
 * and stored in the DailyBriefing table — it is never user-supplied.
 * Only admin users have access to this dashboard.
 */
function formatBriefingContent(content: string): string {
  return content
    .replace(/^(\d+)\.\s+(.+)$/gm, '<h3 class="mt-4 mb-2 text-sm font-semibold">$2</h3>')
    .replace(/^[•\-]\s+(.+)$/gm, '<li class="ml-4 text-sm leading-relaxed">$1</li>')
    .replace(/\n\n/g, "</p><p class='text-sm leading-relaxed text-foreground/85 mb-2'>")
    .replace(/\n/g, "<br>");
}

export function AIBriefingCard() {
  const [content, setContent] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/briefing")
      .then((r) => r.json())
      .then((j) => {
        if (j.data?.content) {
          setContent(j.data.content);
          setGeneratedAt(j.data.generatedAt);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const generate = useCallback(async () => {
    setGenerating(true);
    setContent("");
    try {
      const res = await fetch("/api/dashboard/briefing", { method: "POST" });
      if (!res.ok) {
        setGenerating(false);
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) {
        setGenerating(false);
        return;
      }

      let text = "";
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setContent(text);
      }
      setGeneratedAt(new Date().toISOString());
    } finally {
      setGenerating(false);
    }
  }, []);

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" />
            AI Morning Briefing
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {generatedAt
              ? `Generated ${new Date(generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
              : "Powered by Claude"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={generate}
          disabled={generating}
        >
          <RefreshCw className={`size-3 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Generating..." : "Refresh Briefing"}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        ) : !content ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-muted-foreground">No briefing generated yet today.</p>
            <Button onClick={generate} disabled={generating} size="sm">
              <Sparkles className="mr-1.5 size-3" />
              Generate Briefing
            </Button>
          </div>
        ) : (
          // Content is exclusively from our server-side Claude API — never user-supplied
          <div
            className="prose prose-sm max-w-none text-foreground/85 [&_h3]:text-foreground [&_li]:text-foreground/85"
            dangerouslySetInnerHTML={{ __html: formatBriefingContent(content) }}
          />
        )}
        {generating && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex gap-0.5">
              <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
            </span>
            Claude is analyzing your business
          </div>
        )}
      </CardContent>
    </Card>
  );
}
