"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Box,
  Briefcase,
  Calculator,
  ClipboardCheck,
  ClipboardList,
  Columns3,
  DollarSign,
  FileText,
  Kanban,
  History,
  Image,
  LayoutDashboard,
  Mail,
  Megaphone,
  Printer,
  Receipt,
  ScanBarcode,
  Send,
  Settings2,
  ShoppingCart,
  Sparkles,
  SquareStack,
  Tag,
  Users,
  Warehouse,
} from "lucide-react";

import { navigationItems } from "@/lib/data/navigation";
import { cn } from "@/lib/utils";

const iconMap: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  skus: Box,
  "slat-walls": Columns3,
  generator: Sparkles,
  outputs: History,
  packet: SquareStack,
  contacts: Users,
  pipeline: Kanban,
  quotes: FileText,
  invoices: Receipt,
  orders: ClipboardList,
  inventory: Warehouse,
  "purchase-orders": ShoppingCart,
  scanner: ScanBarcode,
  labels: Tag,
  reorder: AlertTriangle,
  jobs: Briefcase,
  calculator: Calculator,
  gallery: Image,
  "mold-generator": Printer,
  jacob: Bot,
  marketing: Megaphone,
  sequences: Mail,
  campaigns: Send,
  reports: BarChart3,
  revenue: DollarSign,
  "ar-aging": Receipt,
  "inv-valuation": Warehouse,
  "order-fulfillment": ClipboardCheck,
  admin: Settings2,
};

const sectionLabels: Record<string, string> = {
  sales: "Sales",
  operations: "Operations",
  marketing: "Marketing",
  reports: "Reports",
  tools: "Tools",
};

type AppSidebarClientProps = {
  canAccessAdmin: boolean;
  displayName: string;
  role: "ADMIN" | "USER";
  quoteAttentionCount?: number;
  contactAttentionCount?: number;
  invoiceAttentionCount?: number;
  orderAttentionCount?: number;
  inventoryAttentionCount?: number;
  poAttentionCount?: number;
  marketingAttentionCount?: number;
};

export function AppSidebarClient({
  canAccessAdmin,
  displayName,
  role,
  quoteAttentionCount = 0,
  contactAttentionCount = 0,
  invoiceAttentionCount = 0,
  orderAttentionCount = 0,
  inventoryAttentionCount = 0,
  poAttentionCount = 0,
  marketingAttentionCount = 0,
}: AppSidebarClientProps) {
  const pathname = usePathname();
  const items = navigationItems.filter((item) => item.href !== "/admin" || canAccessAdmin);

  // Group items by section
  const sections: Array<{ key: string; label: string | null; items: typeof items }> = [];
  let currentSection = "";

  for (const item of items) {
    if (item.section !== currentSection) {
      currentSection = item.section;
      sections.push({
        key: item.section,
        label: sectionLabels[item.section] ?? null,
        items: [],
      });
    }
    sections[sections.length - 1].items.push(item);
  }

  function getBadge(icon: string) {
    if (icon === "quotes" && quoteAttentionCount > 0) return { count: quoteAttentionCount, color: "bg-amber-500" };
    if (icon === "contacts" && contactAttentionCount > 0) return { count: contactAttentionCount, color: "bg-blue-500" };
    if (icon === "invoices" && invoiceAttentionCount > 0) return { count: invoiceAttentionCount, color: "bg-red-500" };
    if (icon === "orders" && orderAttentionCount > 0) return { count: orderAttentionCount, color: "bg-red-500" };
    if (icon === "inventory" && inventoryAttentionCount > 0) return { count: inventoryAttentionCount, color: "bg-amber-500" };
    if (icon === "purchase-orders" && poAttentionCount > 0) return { count: poAttentionCount, color: "bg-blue-500" };
    if (icon === "reorder" && inventoryAttentionCount > 0) return { count: inventoryAttentionCount, color: "bg-red-500" };
    if (icon === "campaigns" && marketingAttentionCount > 0) return { count: marketingAttentionCount, color: "bg-blue-500" };
    return null;
  }

  return (
    <aside className="flex flex-col border-r border-zinc-800 bg-zinc-900 px-4 py-5 text-zinc-300">
      <div className="sticky top-5 flex flex-1 flex-col">
        {/* Brand */}
        <Link href="/dashboard" className="mb-8 flex flex-col items-center pt-2">
          <img
            alt="RB Architecture Concrete Studio"
            className="h-auto w-full"
            src="/rb-studio-logo-white.png"
          />
        </Link>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.key}>
              {section.label && (
                <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = iconMap[item.icon] ?? Box;
                const badge = getBadge(item.icon);

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
                    <span className="flex-1">{item.label}</span>
                    {badge && (
                      <span className={`rounded-full ${badge.color} px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white`}>
                        {badge.count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
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
