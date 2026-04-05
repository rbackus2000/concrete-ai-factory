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
        <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
          <AppSidebar />
          <main className="overflow-hidden">
            <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
