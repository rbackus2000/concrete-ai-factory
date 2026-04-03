import type { Metadata } from "next";

import { AppSidebar } from "@/components/app-shell/app-sidebar";

import "./globals.css";

export const metadata: Metadata = {
  title: "Concrete AI Factory",
  description: "Internal tooling for SKU definition, prompt generation, and build packet workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans text-foreground">
        <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
          <AppSidebar />
          <main className="relative overflow-hidden">
            <div className="absolute inset-0 bg-concrete-grid bg-[size:42px_42px] opacity-20" />
            <div className="relative mx-auto max-w-7xl px-6 py-8 lg:px-10">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
