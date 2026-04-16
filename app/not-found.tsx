import Link from "next/link";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24">
      <PageHeader
        eyebrow="404"
        title="Page not found"
        description="The requested route does not exist in the Concrete AI Factory."
      />
      <Link href="/dashboard">
        <Button variant="outline">Back to Dashboard</Button>
      </Link>
    </div>
  );
}
