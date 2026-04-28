import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTradeMember } from "@/lib/auth/trade-session";

import SignOutLink from "../sign-out-link";

export const dynamic = "force-dynamic";

export default async function TradeAccountPage() {
  const member = await requireTradeMember();

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Trade portal
        </p>
        <h1 className="mt-2 font-serif text-3xl">Your account.</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Contact name" value={member.contactName} />
          <Row label="Email" value={member.email} />
          <Row label="Phone" value={member.phone ?? "—"} />
          <Row label="Firm" value={member.firmName} />
          <Row label="Profession" value={member.profession ?? "—"} />
          <Row label="Trade discount" value={`${member.tradeDiscountPct}%`} />
          <Row
            label="Member since"
            value={member.approvedAt.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account manager</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Email{" "}
            <a
              href="mailto:trade@backusdesignco.com"
              className="text-primary underline-offset-4 hover:underline"
            >
              trade@backusdesignco.com
            </a>{" "}
            for anything — quotes, lead times, sample replacements, install
            questions, or to update your contact info.
          </p>
          <p className="text-muted-foreground">
            Replies within one business day.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <SignOutLink />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
