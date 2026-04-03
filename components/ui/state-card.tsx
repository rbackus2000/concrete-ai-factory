import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StateCardProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function StateCard({ title, description, action }: StateCardProps) {
  return (
    <Card className="border-white/70 bg-white/85 shadow-panel backdrop-blur">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-7 text-muted-foreground">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}
