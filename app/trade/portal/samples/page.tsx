import { requireTradeMember } from "@/lib/auth/trade-session";

import SampleRequestForm from "./form";

export const dynamic = "force-dynamic";

export default async function TradeSamplesPage() {
  const member = await requireTradeMember();

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Trade portal
        </p>
        <h1 className="mt-2 font-serif text-3xl">Request a sample box.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
          Free for trade members. Includes every Classic and Woodform color and
          our four sealer finishes — labelled and ready to drop into a project
          presentation. Most boxes ship in three to five business days.
        </p>
      </div>

      <SampleRequestForm
        defaultName={member.contactName}
        defaultFirm={member.firmName}
      />
    </div>
  );
}
