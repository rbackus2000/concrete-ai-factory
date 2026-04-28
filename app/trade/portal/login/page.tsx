import LoginForm from "./form";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ from?: string }>;
};

export default async function TradeLoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <div className="rounded-xl border bg-white p-8 shadow-sm">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        Trade portal
      </p>
      <h1 className="mt-2 font-serif text-3xl">Sign in.</h1>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">
        Enter the email associated with your trade account. We&apos;ll send you a one-click sign-in link — no password to remember. Links expire in 30 minutes.
      </p>
      <div className="mt-6">
        <LoginForm fromPath={sp.from ?? null} />
      </div>
      <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">
        Not a trade member yet?{" "}
        <a href="https://backusdesignco.com/trade/apply" className="text-primary underline-offset-4 hover:underline">
          Apply for trade access →
        </a>
      </p>
    </div>
  );
}
