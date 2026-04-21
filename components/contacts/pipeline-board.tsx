"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ContactCard = {
  id: string;
  name: string;
  company: string | null;
  tags: string[];
  totalQuoted: number;
  lastActivity: string | null;
  quotes: {
    quoteNumber: string;
    status: string;
    total: number;
  }[];
  invoices: {
    status: string;
    amountDue: number;
  }[];
};

type PipelineColumn = {
  stage: string;
  contacts: ContactCard[];
  count: number;
  totalValue: number;
};

const stageLabels: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUOTED: "Quoted",
  NEGOTIATING: "Negotiating",
  WON: "Won",
  LOST: "Lost",
};

const stageBorderColors: Record<string, string> = {
  NEW: "border-l-blue-500",
  CONTACTED: "border-l-zinc-400",
  QUOTED: "border-l-amber-500",
  NEGOTIATING: "border-l-orange-500",
  WON: "border-l-emerald-500",
  LOST: "border-l-red-500",
};

const stageHeaderBg: Record<string, string> = {
  WON: "bg-emerald-500/10",
  LOST: "bg-red-500/10",
};

function formatCurrency(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatRelative(date: string | null) {
  if (!date) return "";
  const d = new Date(date);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Card (presentational) ────────────────────────────────────

function CardContent({ contact, stage, isDragging, hasException }: { contact: ContactCard; stage?: string; isDragging?: boolean; hasException?: boolean }) {
  const latestQuote = contact.quotes[0];
  const borderColor = stage ? stageBorderColors[stage] : "border-l-zinc-400";

  return (
    <div
      className={cn(
        "rounded-lg border border-l-2 bg-card p-3 transition-shadow",
        borderColor,
        isDragging && "shadow-lg ring-2 ring-primary/20",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{contact.name}</p>
        {hasException && (
          <Badge variant="destructive" className="text-[10px]">Exception</Badge>
        )}
      </div>
      {contact.company && (
        <p className="text-xs text-muted-foreground">{contact.company}</p>
      )}
      {latestQuote && (
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{latestQuote.status}</Badge>
          <span className="text-xs font-medium">{formatCurrency(latestQuote.total)}</span>
        </div>
      )}
      {contact.lastActivity && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {formatRelative(contact.lastActivity)}
        </p>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {contact.invoices?.some((i) => i.status === "OVERDUE") && (
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">$ overdue</span>
        )}
        {!contact.invoices?.some((i) => i.status === "OVERDUE") && contact.invoices?.length > 0 && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">$ unpaid</span>
        )}
        {contact.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Draggable Wrapper ────────────────────────────────────────

function DraggableItem({ contact, stage, hasException }: { contact: ContactCard; stage: string; hasException?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: contact.id,
    data: { stage },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.4 : 1 }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <a href={`/contacts/${contact.id}`} onClick={(e) => isDragging && e.preventDefault()}>
        <CardContent contact={contact} stage={stage} hasException={hasException} />
      </a>
    </div>
  );
}

// ── Droppable Column ─────────────────────────────────────────

function DroppableColumn({ stage, column, children }: { stage: string; column: PipelineColumn; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[400px] w-[260px] shrink-0 flex-col rounded-xl border bg-secondary/20",
        isOver && "ring-2 ring-primary/30",
      )}
    >
      <div className={cn("rounded-t-xl border-b px-3 py-2.5", stageHeaderBg[stage])}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{stageLabels[stage]}</h3>
          <Badge variant="secondary">{column.count}</Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{formatCurrency(column.totalValue)}</p>
        {stage === "NEW" && (
          <Link href="/contacts/new">
            <Button size="sm" variant="ghost" className="mt-1 h-7 w-full text-xs">
              <Plus className="mr-1 size-3" />
              New Contact
            </Button>
          </Link>
        )}
      </div>
      <div className="flex-1 space-y-2 p-2">
        {children}
      </div>
    </div>
  );
}

// ── Board ────────────────────────────────────────────────────

export function PipelineBoard({ pipeline, exceptionContactIds = [] }: { pipeline: PipelineColumn[]; exceptionContactIds?: string[] }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const contactId = active.id as string;
    const newStage = over.id as string;

    // Find current stage
    const currentColumn = pipeline.find((col) =>
      col.contacts.some((c) => c.id === contactId),
    );
    if (!currentColumn || currentColumn.stage === newStage) return;

    await fetch(`/api/contacts/${contactId}/stage`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });

    router.refresh();
  }

  const allContacts = pipeline.flatMap((col) =>
    col.contacts.map((c) => ({ ...c, stage: col.stage })),
  );
  const activeContact = activeId ? allContacts.find((c) => c.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {pipeline.map((column) => (
          <DroppableColumn key={column.stage} stage={column.stage} column={column}>
            {column.contacts.map((contact) => (
              <DraggableItem key={contact.id} contact={contact} stage={column.stage} hasException={exceptionContactIds.includes(contact.id)} />
            ))}
          </DroppableColumn>
        ))}
      </div>

      <DragOverlay>
        {activeContact ? (
          <CardContent contact={activeContact} stage={activeContact.stage} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
