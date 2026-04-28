import Link from "next/link";

import { getTradeSession } from "@/lib/auth/trade-session";

import SignOutLink from "./sign-out-link";

export const dynamic = "force-dynamic";

const NAV = [
  { label: "Dashboard", href: "/trade/portal" },
  { label: "Catalog", href: "/trade/portal/catalog" },
  { label: "Design Packets", href: "/trade/portal/packets" },
  { label: "Trade Pricing", href: "/trade/portal/pricing" },
  { label: "Samples", href: "/trade/portal/samples" },
  { label: "Request Quote", href: "/trade/portal/quotes/new" },
  { label: "Account", href: "/trade/portal/account" },
] as const;

export default async function TradePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await getTradeSession();

  // Login / verify pages render through this layout too. When unauthenticated
  // we render a stripped-down shell (the middleware has already gated the
  // protected routes — anything we render here is a public page).
  if (!member) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
            <Link href="/trade/portal/login" className="font-serif text-lg tracking-wide">
              BACKUS<span className="font-semibold">DESIGN</span>CO. <span className="text-sm text-muted-foreground">— Trade</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-12">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/trade/portal" className="font-serif text-lg tracking-wide">
            BACKUS<span className="font-semibold">DESIGN</span>CO. <span className="text-sm text-muted-foreground">— Trade Portal</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              {member.firmName}
            </span>
            <SignOutLink />
          </div>
        </div>
        <nav className="border-t bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 overflow-x-auto px-6 py-3 text-sm">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="whitespace-nowrap text-foreground/80 hover:text-foreground"
              >
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
