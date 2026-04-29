import type { Metadata } from "next";
import { headers } from "next/headers";

import { AppSidebar } from "@/components/app-shell/app-sidebar";

import "./globals.css";

export const metadata: Metadata = {
  title: "Concrete AI Factory",
  description: "Internal tooling for SKU definition, prompt generation, and build packet workflows.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Middleware tags trade-portal requests so we can render them WITHOUT
  // the staff sidebar/shell. External trade members must never see
  // internal navigation. The trade portal supplies its own header/nav
  // via app/trade/portal/layout.tsx.
  //
  // The /login and /account/password-change routes are also chrome-less:
  // there's no signed-in staff session to populate the sidebar with, and
  // a forced password-change page should not let you click around.
  const h = await headers();
  const isTradePortal = h.get("x-route-shell") === "trade-portal";
  const pathname = h.get("x-pathname") ?? "";
  const isAuthChrome =
    pathname === "/login" || pathname.startsWith("/account/password-change");
  const skipShell = isTradePortal || isAuthChrome;

  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans text-foreground">
        {skipShell ? (
          children
        ) : (
          <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
            <AppSidebar />
            <main className="overflow-hidden">
              <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
                {children}
              </div>
            </main>
          </div>
        )}
      </body>
    </html>
  );
}
