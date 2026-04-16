"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateProposalStatusAction } from "@/app/actions/proposal-actions";

const STATUS_TRANSITIONS: Record<string, { next: string; label: string }[]> = {
  DRAFT: [{ next: "SENT", label: "Mark as Sent" }],
  SENT: [{ next: "VIEWED", label: "Mark as Viewed" }],
  VIEWED: [
    { next: "ACCEPTED", label: "Accept" },
    { next: "REJECTED", label: "Reject" },
  ],
};

type Props = { proposalId: string; currentStatus: string };

export default function ProposalStatusActions({ proposalId, currentStatus }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const transitions = STATUS_TRANSITIONS[currentStatus];
  if (!transitions || transitions.length === 0) return null;

  return (
    <div className="flex gap-2">
      {transitions.map((t) => (
        <Button
          key={t.next}
          size="sm"
          variant={t.next === "REJECTED" ? "destructive" : "outline"}
          className="gap-1.5"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await updateProposalStatusAction(proposalId, t.next);
              router.refresh();
            });
          }}
        >
          <ArrowRight className="h-3 w-3" /> {t.label}
        </Button>
      ))}
    </div>
  );
}
