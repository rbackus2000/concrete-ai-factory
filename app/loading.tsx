import { StateCard } from "@/components/ui/state-card";

export default function Loading() {
  return (
    <div className="space-y-8">
      <StateCard
        title="Loading workspace"
        description="Pulling live Prisma-backed records for the current internal workflow."
      />
    </div>
  );
}
