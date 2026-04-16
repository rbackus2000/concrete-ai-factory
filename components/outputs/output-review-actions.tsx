"use client";

import { useTransition } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveOutputAction, rejectOutputAction } from "@/app/actions/output-actions";

type OutputReviewActionsProps = {
  outputId: string;
  currentStatus: string;
};

export default function OutputReviewActions({ outputId, currentStatus }: OutputReviewActionsProps) {
  const [isPending, startTransition] = useTransition();

  if (currentStatus !== "GENERATED") return null;

  const handleApprove = () => {
    startTransition(async () => {
      await approveOutputAction(outputId);
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      await rejectOutputAction(outputId);
    });
  };

  return (
    <div className="flex gap-2">
      <Button onClick={handleApprove} disabled={isPending} variant="outline" className="gap-2 text-green-700 border-green-300 hover:bg-green-50">
        <CheckCircle2 className="h-4 w-4" /> Approve
      </Button>
      <Button onClick={handleReject} disabled={isPending} variant="outline" className="gap-2 text-red-700 border-red-300 hover:bg-red-50">
        <XCircle className="h-4 w-4" /> Reject
      </Button>
    </div>
  );
}
