"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { StateCard } from "@/components/ui/state-card";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-8">
      <StateCard
        title="Something went wrong"
        description={error.message || "The internal tool hit an unexpected error."}
        action={
          <Button onClick={reset} type="button">
            Try again
          </Button>
        }
      />
    </div>
  );
}
