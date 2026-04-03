import { cn } from "@/lib/utils";

type ActionNoticeProps = {
  message?: string | null;
  tone?: "success" | "error" | "info";
};

export function ActionNotice({ message, tone = "info" }: ActionNoticeProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        tone === "error" && "border-red-200 bg-red-50 text-red-700",
        tone === "info" && "border-border/70 bg-secondary/20 text-muted-foreground",
      )}
    >
      {message}
    </p>
  );
}
