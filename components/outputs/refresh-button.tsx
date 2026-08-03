"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

type RefreshButtonProps = Omit<ButtonProps, "onClick">;

/**
 * Re-runs the server component for the current URL. Image renders finish
 * asynchronously, so a newly generated output only appears after the page is
 * re-fetched. router.refresh() keeps the active filters and scroll position,
 * unlike a full reload.
 */
export function RefreshButton({ className, ...props }: RefreshButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      className={cn("gap-2", className)}
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
      size="sm"
      variant="outline"
      {...props}
    >
      <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
      {isPending ? "Refreshing" : "Refresh"}
    </Button>
  );
}
