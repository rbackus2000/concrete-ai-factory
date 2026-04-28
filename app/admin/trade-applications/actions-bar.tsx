"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
  approveTradeApplicationAction,
  declineTradeApplicationAction,
} from "@/app/actions/trade-application-actions";

type Props = {
  contactId: string;
  contactName: string;
};

export default function ActionsBar({ contactId, contactName }: Props) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "decline">("idle");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    if (
      !confirm(
        `Approve ${contactName}? This provisions trade portal access and emails a welcome + sign-in link.`,
      )
    ) {
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await approveTradeApplicationAction(contactId);
        setMessage(
          result.emailSent
            ? `Approved. Welcome email sent.`
            : `Approved. Welcome email failed to send — resend manually.`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Approval failed");
      }
    });
  }

  function handleDecline() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await declineTradeApplicationAction(contactId, reason);
        setMessage(
          result.emailSent
            ? "Declined. Decline email sent."
            : "Declined. Decline email failed to send.",
        );
        setMode("idle");
        setReason("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Decline failed");
      }
    });
  }

  if (message) {
    return <p className="text-sm text-emerald-600">{message}</p>;
  }

  if (mode === "decline") {
    return (
      <div className="space-y-2">
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional decline reason — included in the email if provided."
          rows={3}
        />
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDecline}
            disabled={pending}
          >
            {pending ? "Declining…" : "Send decline"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMode("idle");
              setReason("");
            }}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Button onClick={handleApprove} disabled={pending} size="sm">
        {pending ? "Approving…" : "Approve"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setMode("decline")}
        disabled={pending}
      >
        Decline
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
