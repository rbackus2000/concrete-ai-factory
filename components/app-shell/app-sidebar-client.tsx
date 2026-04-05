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
    <aside className="flex flex-col border-r border-zinc-800 bg-zinc-900 px-4 py-5 text-zinc-300">
      <div className="sticky top-5 flex flex-1 flex-col">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center px-2 pt-2">
          <img
            alt="RB Studio"
            className="h-16 w-auto"
            src="/rb-studio-logo-white.png"
          />
          <p className="mt-3 text-[10px] tracking-[0.25em] text-zinc-500">CONCRETE AI FACTORY</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = iconMap[item.icon];

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-zinc-800 text-white font-medium"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="mt-6 border-t border-zinc-800 pt-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-300">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-200">{displayName}</p>
              <p className="text-[11px] text-zinc-500">{role}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
