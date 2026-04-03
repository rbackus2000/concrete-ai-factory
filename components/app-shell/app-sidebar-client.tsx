"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Box,
  Calculator,
  Columns3,
  History,
  LayoutDashboard,
  Settings2,
  Sparkles,
  SquareStack,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { navigationItems } from "@/lib/data/navigation";
import { cn } from "@/lib/utils";

const iconMap = {
  dashboard: LayoutDashboard,
  skus: Box,
  "slat-walls": Columns3,
  generator: Sparkles,
  outputs: History,
  packet: SquareStack,
  calculator: Calculator,
  admin: Settings2,
};

type AppSidebarClientProps = {
  canAccessAdmin: boolean;
  displayName: string;
  role: "ADMIN" | "USER";
};

export function AppSidebarClient({
  canAccessAdmin,
  displayName,
  role,
}: AppSidebarClientProps) {
  const pathname = usePathname();
  const items = navigationItems.filter((item) => item.href !== "/admin" || canAccessAdmin);

  return (
    <aside className="border-r border-white/40 bg-[linear-gradient(180deg,rgba(67,52,43,0.97),rgba(40,31,24,0.98))] px-5 py-6 text-stone-100">
      <div className="sticky top-6 space-y-8">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-white/10 text-stone-50 hover:bg-white/10">Internal auth enabled</Badge>
            <Badge className="bg-white/10 text-stone-50 hover:bg-white/10">{role}</Badge>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-stone-300">Concrete AI Factory</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Production control for concrete products</h1>
          </div>
          <p className="text-sm leading-7 text-stone-300">
            Signed in as {displayName}. Internal workflows stay available to all authenticated users, while admin records stay gated.
          </p>
        </div>

        <nav className="space-y-2">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = iconMap[item.icon];

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                  isActive
                    ? "bg-white text-primary shadow-lg"
                    : "text-stone-200 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-medium text-white">Seeded SKU</p>
          <p className="mt-2 text-2xl font-semibold text-white">S1-EROSION</p>
          <p className="mt-2 text-sm leading-6 text-stone-300">
            GFRC architectural vessel sink with seeded prompts, mold rules, QC checkpoints, and packet sections.
          </p>
        </div>
      </div>
    </aside>
  );
}
