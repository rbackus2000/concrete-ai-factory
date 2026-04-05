"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Wrench,
  ChevronDown,
  ChevronRight,
  Globe,
  Download,
  Search,
  Package,
  DollarSign,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────

type EquipmentItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  why: string;
  options: string;
  costLow: number;
  costHigh: number;
  priority: string;
  phase: number;
  supplierName: string | null;
  supplierUrl: string | null;
  supplierNotes: string | null;
  status: string;
  actualCost: number | null;
  purchaseDate: string | null;
  notes: string | null;
  quantity: number;
  sortOrder: number;
};

type EquipmentCategory = {
  id: string;
  name: string;
  slug: string;
  phase: number;
  phaseLabel: string;
  sortOrder: number;
  items: EquipmentItem[];
};

type Budget = {
  id: string;
  label: string;
  allocatedAmount: number;
  notes: string | null;
};

type Props = {
  categories: EquipmentCategory[];
  budgets: Budget[];
};

// ── Status & Priority Config ──────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  needed: { label: "Needed", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  researching: { label: "Researching", className: "bg-blue-50 text-blue-700 border-blue-200" },
  quoted: { label: "Quoted", className: "bg-amber-50 text-amber-700 border-amber-200" },
  ordered: { label: "Ordered", className: "bg-orange-50 text-orange-700 border-orange-200" },
  received: { label: "Received", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  installed: { label: "Installed", className: "bg-blue-50 text-blue-800 border-blue-300" },
};

const PRIORITY_BORDER: Record<string, string> = {
  essential: "border-l-[3px] border-l-red-400",
  recommended: "border-l-[3px] border-l-amber-400",
  optional: "border-l-[3px] border-l-zinc-300",
};

const PRIORITY_BADGE: Record<string, string> = {
  essential: "bg-red-50 text-red-700 border-red-200",
  recommended: "bg-amber-50 text-amber-700 border-amber-200",
  optional: "bg-zinc-50 text-zinc-500 border-zinc-200",
};

const STATUS_OPTIONS = ["needed", "researching", "quoted", "ordered", "received", "installed"];

const PHASES = [
  { num: 1, label: "GFRC Fabrication" },
  { num: 2, label: "Surface Finishing" },
  { num: 3, label: "UV Print" },
  { num: 4, label: "Steel Fabrication" },
  { num: 5, label: "General Studio" },
  { num: 6, label: "Infrastructure" },
];

// ── Component ─────────────────────────────────────────────────

export function EquipmentTracker({ categories, budgets: _budgets }: Props) {
  const [activePhase, setActivePhase] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<EquipmentItem[]>(() =>
    categories.flatMap((c) => c.items),
  );
  const [expandedWhy, setExpandedWhy] = useState<Set<string>>(new Set());
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set());
  const [savingItems, setSavingItems] = useState<Set<string>>(new Set());

  const phaseStats = useMemo(() => {
    const stats = new Map<number, { costLow: number; costHigh: number; actual: number; total: number; received: number }>();
    for (const item of items) {
      const s = stats.get(item.phase) || { costLow: 0, costHigh: 0, actual: 0, total: 0, received: 0 };
      s.costLow += item.costLow * item.quantity;
      s.costHigh += item.costHigh * item.quantity;
      s.actual += (item.actualCost ?? 0) * item.quantity;
      s.total += 1;
      if (item.status === "received" || item.status === "installed") s.received += 1;
      stats.set(item.phase, s);
    }
    return stats;
  }, [items]);

  const totals = useMemo(() => {
    let costLow = 0, costHigh = 0, actual = 0;
    for (const [, s] of phaseStats) {
      costLow += s.costLow;
      costHigh += s.costHigh;
      actual += s.actual;
    }
    return { costLow, costHigh, actual };
  }, [phaseStats]);

  const filteredCategories = useMemo(() => {
    return categories
      .filter((c) => c.phase === activePhase)
      .map((c) => ({
        ...c,
        items: items
          .filter((i) => i.categoryId === c.id)
          .filter((i) => statusFilter === "all" || i.status === statusFilter)
          .filter((i) => priorityFilter === "all" || i.priority === priorityFilter)
          .filter((i) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q);
          }),
      }))
      .filter((c) => c.items.length > 0);
  }, [categories, items, activePhase, statusFilter, priorityFilter, searchQuery]);

  const updateItem = useCallback(async (id: string, updates: Partial<EquipmentItem>) => {
    setSavingItems((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/equipment/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updated } : i)));
      }
    } finally {
      setSavingItems((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const toggleSet = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-blue-600">Admin / Equipment</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Equipment Procurement Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            RB Studio concrete studio build-out — {fmt(totals.costLow)} to {fmt(totals.costHigh)} total budget range
          </p>
        </header>
        <a
          href="/api/equipment/export"
          className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </div>

      {/* Budget Progress */}
      {totals.actual > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Spent: {fmt(totals.actual)}</span>
            <span>{Math.round((totals.actual / totals.costLow) * 100)}% of minimum estimate</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-secondary">
            <div
              className="h-2 rounded-full bg-blue-600 transition-all"
              style={{ width: `${Math.min(100, (totals.actual / totals.costHigh) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Phase Timeline */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-card p-3">
        {PHASES.map((p, idx) => {
          const stats = phaseStats.get(p.num);
          const pct = stats ? Math.round((stats.received / stats.total) * 100) : 0;
          const isActive = activePhase === p.num;
          return (
            <div key={p.num} className="flex items-center">
              <button
                onClick={() => setActivePhase(p.num)}
                className={`flex flex-col rounded-lg px-3 py-2 text-left transition-colors ${
                  isActive
                    ? "bg-blue-50 ring-1 ring-blue-300"
                    : "hover:bg-secondary"
                }`}
              >
                <span className={`text-xs font-bold ${isActive ? "text-blue-700" : "text-muted-foreground"}`}>
                  Phase {p.num}
                </span>
                <span className={`text-[11px] ${isActive ? "text-blue-600" : "text-muted-foreground"}`}>
                  {p.label}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {stats ? `${fmt(stats.costLow)}-${fmt(stats.costHigh)}` : "$0"}
                </span>
                <div className="mt-1 h-1 w-full rounded-full bg-secondary">
                  <div className="h-1 rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{pct}% complete</span>
              </button>
              {idx < PHASES.length - 1 && <ArrowRight className="mx-1 h-3 w-3 shrink-0 text-border" />}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Phase Summary Cards */}
          {(() => {
            const stats = phaseStats.get(activePhase);
            if (!stats) return null;
            return (
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Package className="h-4 w-4" /> Total Items
                  </div>
                  <div className="mt-1 text-2xl font-bold text-foreground">{stats.total}</div>
                </div>
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <DollarSign className="h-4 w-4" /> Estimated Range
                  </div>
                  <div className="mt-1 text-lg font-bold text-foreground">
                    {fmt(stats.costLow)} - {fmt(stats.costHigh)}
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4" /> Received
                  </div>
                  <div className="mt-1 text-2xl font-bold text-emerald-600">
                    {stats.received} <span className="text-sm text-muted-foreground">/ {stats.total}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none"
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm outline-none"
            >
              <option value="all">All Priority</option>
              <option value="essential">Essential</option>
              <option value="recommended">Recommended</option>
              <option value="optional">Optional</option>
            </select>
          </div>

          {/* Equipment Cards by Category */}
          {filteredCategories.map((cat) => (
            <div key={cat.id}>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
                <Wrench className="h-3.5 w-3.5" />
                {cat.name}
              </h3>
              <div className="space-y-3">
                {cat.items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    expandedWhy={expandedWhy.has(item.id)}
                    expandedOptions={expandedOptions.has(item.id)}
                    saving={savingItems.has(item.id)}
                    onToggleWhy={() => toggleSet(expandedWhy, item.id, setExpandedWhy)}
                    onToggleOptions={() => toggleSet(expandedOptions, item.id, setExpandedOptions)}
                    onUpdate={updateItem}
                    fmt={fmt}
                  />
                ))}
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
              No equipment items match your filters.
            </div>
          )}
        </div>

        {/* Budget Sidebar */}
        <div className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-600">Budget Summary</h3>
              <div className="space-y-2 text-sm">
                {PHASES.map((p) => {
                  const s = phaseStats.get(p.num);
                  if (!s) return null;
                  return (
                    <div key={p.num} className="flex items-center justify-between">
                      <span className="text-muted-foreground">Phase {p.num}</span>
                      <span className="font-medium text-foreground">{fmt(s.costLow)}-{fmt(s.costHigh)}</span>
                    </div>
                  );
                })}
                <div className="border-t pt-2">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-blue-600">TOTAL</span>
                    <span className="text-blue-600">{fmt(totals.costLow)}-{fmt(totals.costHigh)}</span>
                  </div>
                </div>
                {totals.actual > 0 && (
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-emerald-600">Spent</span>
                    <span className="font-bold text-emerald-600">{fmt(totals.actual)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-600">Phase Completion</h3>
              <div className="space-y-2.5">
                {PHASES.map((p) => {
                  const s = phaseStats.get(p.num);
                  if (!s) return null;
                  const pct = Math.round((s.received / s.total) * 100);
                  return (
                    <div key={p.num}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Phase {p.num}</span>
                        <span className="font-medium text-foreground">{s.received}/{s.total}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-secondary">
                        <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-blue-600">Status Breakdown</h3>
              <div className="space-y-1.5 text-sm">
                {STATUS_OPTIONS.map((s) => {
                  const count = items.filter((i) => i.status === s).length;
                  if (count === 0) return null;
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <div key={s} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{cfg?.label ?? s}</span>
                      <span className="font-medium text-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Item Card ─────────────────────────────────────────────────

function ItemCard({
  item,
  expandedWhy,
  expandedOptions,
  saving,
  onToggleWhy,
  onToggleOptions,
  onUpdate,
  fmt,
}: {
  item: EquipmentItem;
  expandedWhy: boolean;
  expandedOptions: boolean;
  saving: boolean;
  onToggleWhy: () => void;
  onToggleOptions: () => void;
  onUpdate: (id: string, updates: Partial<EquipmentItem>) => Promise<void>;
  fmt: (n: number) => string;
}) {
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.needed;
  const priorityBorder = PRIORITY_BORDER[item.priority] ?? PRIORITY_BORDER.optional;
  const priorityBadge = PRIORITY_BADGE[item.priority] ?? PRIORITY_BADGE.optional;
  const [localNotes, setLocalNotes] = useState(item.notes ?? "");
  const [localActualCost, setLocalActualCost] = useState(item.actualCost?.toString() ?? "");
  const [localPurchaseDate, setLocalPurchaseDate] = useState(
    item.purchaseDate ? new Date(item.purchaseDate).toISOString().split("T")[0] : "",
  );

  let parsedOptions: string[] = [];
  try {
    parsedOptions = JSON.parse(item.options);
  } catch {
    parsedOptions = [];
  }

  const costDisplay = item.quantity > 1
    ? `${item.quantity}x @ ${fmt(item.costLow)}-${fmt(item.costHigh)} ea = ${fmt(item.costLow * item.quantity)}-${fmt(item.costHigh * item.quantity)}`
    : `${fmt(item.costLow)} - ${fmt(item.costHigh)} est.`;

  return (
    <div className={`rounded-lg border bg-card shadow-sm ${priorityBorder} ${saving ? "opacity-60" : ""}`}>
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h4 className="font-semibold text-foreground">{item.name}</h4>
            <div className="mt-1 flex items-center gap-2">
              <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusCfg.className}`}>
                {statusCfg.label}
              </span>
              <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize ${priorityBadge}`}>
                {item.priority}
              </span>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">{costDisplay}</div>
        </div>

        {/* Description */}
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>

        {/* Collapsible: Why */}
        <button onClick={onToggleWhy} className="mt-3 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
          {expandedWhy ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Why This Matters
        </button>
        {expandedWhy && (
          <p className="mt-1 rounded-md bg-blue-50 p-2.5 text-sm text-blue-800">{item.why}</p>
        )}

        {/* Collapsible: Options */}
        {parsedOptions.length > 0 && (
          <>
            <button onClick={onToggleOptions} className="mt-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
              {expandedOptions ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Options ({parsedOptions.length})
            </button>
            {expandedOptions && (
              <ul className="mt-1 space-y-1 rounded-md bg-secondary p-2.5 text-sm text-foreground">
                {parsedOptions.map((opt, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 text-blue-500">-</span>
                    <span>{opt}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* Supplier */}
        {item.supplierName && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            {item.supplierUrl ? (
              <a href={item.supplierUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                {item.supplierName}
              </a>
            ) : (
              <span className="text-muted-foreground">{item.supplierName}</span>
            )}
            {item.supplierNotes && <span className="text-xs text-muted-foreground">- {item.supplierNotes}</span>}
          </div>
        )}

        {/* Notes */}
        <div className="mt-3">
          <textarea
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={() => {
              if (localNotes !== (item.notes ?? "")) {
                onUpdate(item.id, { notes: localNotes || null });
              }
            }}
            placeholder="Add notes..."
            rows={1}
            className="w-full resize-none rounded-md border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Status Update Row */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
          <select
            value={item.status}
            onChange={(e) => onUpdate(item.id, { status: e.target.value })}
            className="rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">$</span>
            <input
              type="number"
              value={localActualCost}
              onChange={(e) => setLocalActualCost(e.target.value)}
              onBlur={() => {
                const val = localActualCost ? parseInt(localActualCost) : null;
                if (val !== item.actualCost) {
                  onUpdate(item.id, { actualCost: val } as Partial<EquipmentItem>);
                }
              }}
              placeholder="Actual cost"
              className="w-24 rounded-md border bg-background px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
          </div>
          <input
            type="date"
            value={localPurchaseDate}
            onChange={(e) => {
              setLocalPurchaseDate(e.target.value);
              onUpdate(item.id, { purchaseDate: e.target.value || null } as Partial<EquipmentItem>);
            }}
            className="rounded-md border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
    </div>
  );
}
