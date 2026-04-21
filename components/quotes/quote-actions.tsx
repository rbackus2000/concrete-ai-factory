"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Edit,
  Send,
  Copy,
  ArrowRightCircle,
  ExternalLink,
  Trash2,
  Receipt,
  Printer,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type QuoteActionsProps = {
  quote: {
    id: string;
    status: string;
    publicToken: string;
  };
};

export function QuoteActions({ quote }: QuoteActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(action: string) {
    setLoading(action);
    try {
      if (action === "send") {
        const res = await fetch(`/api/quotes/${quote.id}/send`, { method: "POST" });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to send");
          return;
        }
      } else if (action === "duplicate") {
        const res = await fetch(`/api/quotes/${quote.id}/duplicate`, { method: "POST" });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to duplicate");
          return;
        }
        const { data } = await res.json();
        router.push(`/quotes/${data.id}`);
        return;
      } else if (action === "convert") {
        if (!confirm("Convert this signed quote to an order?")) return;
        const res = await fetch(`/api/quotes/${quote.id}/convert`, { method: "POST" });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to convert");
          return;
        }
      } else if (action === "invoice") {
        const res = await fetch(`/api/invoices/from-quote/${quote.id}`, { method: "POST" });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to create invoice");
          return;
        }
        const { data } = await res.json();
        router.push(`/invoices/${data.id}`);
        return;
      } else if (action === "delete") {
        if (!confirm("Delete this draft quote? This cannot be undone.")) return;
        const res = await fetch(`/api/quotes/${quote.id}`, { method: "DELETE" });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Failed to delete");
          return;
        }
        router.push("/quotes");
        return;
      }
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(quote.status === "DRAFT" || quote.status === "VIEWED") && (
        <a href={`/quotes/${quote.id}/edit`}>
          <Button variant="outline" size="sm">
            <Edit className="mr-1.5 size-3.5" />
            Edit
          </Button>
        </a>
      )}

      {quote.status === "DRAFT" && (
        <Button
          size="sm"
          onClick={() => handleAction("send")}
          disabled={loading === "send"}
        >
          <Send className="mr-1.5 size-3.5" />
          {loading === "send" ? "Sending..." : "Send"}
        </Button>
      )}

      <a href={`/q/${quote.publicToken}`} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm">
          <ExternalLink className="mr-1.5 size-3.5" />
          Preview
        </Button>
      </a>

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const w = window.open(`/q/${quote.publicToken}`, "_blank");
          if (w) {
            w.addEventListener("load", () => {
              setTimeout(() => w.print(), 500);
            });
          }
        }}
      >
        <Printer className="mr-1.5 size-3.5" />
        Print
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => handleAction("duplicate")}
        disabled={loading === "duplicate"}
      >
        <Copy className="mr-1.5 size-3.5" />
        {loading === "duplicate" ? "Duplicating..." : "Duplicate"}
      </Button>

      {quote.status === "SIGNED" && (
        <>
          <Button
            size="sm"
            onClick={() => handleAction("invoice")}
            disabled={loading === "invoice"}
          >
            <Receipt className="mr-1.5 size-3.5" />
            {loading === "invoice" ? "Creating..." : "Convert to Invoice"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction("convert")}
            disabled={loading === "convert"}
          >
            <ArrowRightCircle className="mr-1.5 size-3.5" />
            {loading === "convert" ? "Converting..." : "Convert to Order"}
          </Button>
        </>
      )}

      {quote.status === "DRAFT" && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => handleAction("delete")}
          disabled={loading === "delete"}
        >
          <Trash2 className="mr-1.5 size-3.5" />
          Delete
        </Button>
      )}
    </div>
  );
}
