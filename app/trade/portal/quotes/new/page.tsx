import { requireTradeMember } from "@/lib/auth/trade-session";

import QuoteRequestForm from "./form";

export const dynamic = "force-dynamic";

export default async function TradeQuoteRequestPage() {
  const member = await requireTradeMember();
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Trade portal
        </p>
        <h1 className="mt-2 font-serif text-3xl">Request a quote.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
          Send us a project brief — pieces you want, finishes, quantities,
          shipping window. Your account manager replies with a fixed quote at
          your {member.tradeDiscountPct}% trade pricing within one business day.
        </p>
      </div>

      <QuoteRequestForm />
    </div>
  );
}
