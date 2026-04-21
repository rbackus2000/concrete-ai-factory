"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  Send,
  ExternalLink,
  Package,
  ChevronDown,
  ChevronUp,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LineItemValues, PricingTier } from "@/lib/schemas/quote";

import { SkuCatalogModal } from "./sku-catalog-modal";
import { QuotePreview } from "./quote-preview";

type ContactResult = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
};

type QuoteData = {
  id?: string;
  quoteNumber?: string;
  publicToken?: string;
  pricingTier?: PricingTier;
  contactId?: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  customerMessage: string;
  notes: string;
  terms: string;
  validUntil: string;
  lineItems: LineItemValues[];
  discountAmount: number;
  taxRate: number;
};

export function QuoteBuilder({ initial }: { initial?: QuoteData }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSkuModal, setShowSkuModal] = useState(false);
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [pricingTier, setPricingTier] = useState<PricingTier>(initial?.pricingTier ?? "RETAIL");

  // Contact linking state
  const [selectedContactId, setSelectedContactId] = useState<string | null>(initial?.contactId ?? null);
  const [contactSearch, setContactSearch] = useState("");
  const [contactResults, setContactResults] = useState<ContactResult[]>([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [selectedContactName, setSelectedContactName] = useState<string | null>(
    initial?.contactId && initial?.contactName ? initial.contactName : null,
  );

  const searchContacts = useCallback(async (query: string) => {
    if (query.length < 2) {
      setContactResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const { data } = await res.json();
        setContactResults(data);
        setShowContactDropdown(true);
      }
    } catch {
      // silently fail
    }
  }, []);

  const selectContact = useCallback((contact: ContactResult) => {
    setSelectedContactId(contact.id);
    setSelectedContactName(contact.name);
    setContactName(contact.name);
    setContactEmail(contact.email);
    setContactPhone(contact.phone ?? "");
    setCompanyName(contact.company ?? "");
    setContactSearch("");
    setShowContactDropdown(false);
  }, []);

  const clearContact = useCallback(() => {
    setSelectedContactId(null);
    setSelectedContactName(null);
  }, []);

  // Form state
  const [contactName, setContactName] = useState(initial?.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? "");
  const [companyName, setCompanyName] = useState(initial?.companyName ?? "");
  const [customerMessage, setCustomerMessage] = useState(initial?.customerMessage ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [terms, setTerms] = useState(
    initial?.terms ??
      "Payment is due within 30 days of invoice. All prices are in USD. Custom products are non-refundable once production has started.",
  );
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? "");
  const [lineItems, setLineItems] = useState<LineItemValues[]>(initial?.lineItems ?? []);
  const [discountAmount, setDiscountAmount] = useState(initial?.discountAmount ?? 0);
  const [taxRate, setTaxRate] = useState(initial?.taxRate ?? 0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Computed totals
  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => {
      const itemTotal = item.unitPrice * item.quantity * (1 - item.discount / 100);
      return sum + itemTotal;
    }, 0);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (taxRate / 100);
    const total = afterDiscount + taxAmount;
    return { subtotal, taxAmount, total };
  }, [lineItems, discountAmount, taxRate]);

  const addCustomItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      {
        name: "",
        description: "",
        unitPrice: 0,
        quantity: 1,
        discount: 0,
        lineTotal: 0,
        customerCanEditQty: false,
        customerCanRemove: false,
        isOptional: false,
        isSelected: true,
        sortOrder: prev.length,
      },
    ]);
  }, []);

  const addSkuItem = useCallback(
    (sku: {
      id: string;
      code: string;
      name: string;
      category: string;
      retailPrice: number | null;
      wholesalePrice: number | null;
      description: string | null;
    }) => {
      const price =
        pricingTier === "WHOLESALE"
          ? (sku.wholesalePrice ?? sku.retailPrice ?? 0)
          : (sku.retailPrice ?? 0);
      setLineItems((prev) => [
        ...prev,
        {
          skuId: sku.id,
          skuCode: sku.code,
          name: sku.name,
          description: sku.description ?? "",
          category: sku.category,
          unitPrice: price,
          quantity: 1,
          discount: 0,
          lineTotal: price,
          customerCanEditQty: false,
          customerCanRemove: false,
          isOptional: false,
          isSelected: true,
          sortOrder: prev.length,
        },
      ]);
      setShowSkuModal(false);
    },
    [pricingTier],
  );

  const updateItem = useCallback(
    (index: number, updates: Partial<LineItemValues>) => {
      setLineItems((prev) =>
        prev.map((item, i) => {
          if (i !== index) return item;
          const updated = { ...item, ...updates };
          updated.lineTotal =
            updated.unitPrice * updated.quantity * (1 - updated.discount / 100);
          return updated;
        }),
      );
    },
    [],
  );

  const removeItem = useCallback((index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveItem = useCallback((from: number, to: number) => {
    setLineItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((item, i) => ({ ...item, sortOrder: i }));
    });
  }, []);

  function buildPayload() {
    return {
      pricingTier,
      contactId: selectedContactId ?? undefined,
      contactName,
      contactEmail,
      contactPhone,
      companyName,
      customerMessage,
      notes,
      terms,
      validUntil,
      lineItems: lineItems.map((item) => ({
        ...item,
        lineTotal: item.unitPrice * item.quantity * (1 - item.discount / 100),
      })),
      subtotal: totals.subtotal,
      discountAmount,
      taxRate,
      taxAmount: totals.taxAmount,
      total: totals.total,
    };
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = buildPayload();
      const url = initial?.id ? `/api/quotes/${initial.id}` : "/api/quotes";
      const method = initial?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save quote");
        return;
      }

      const { data } = await res.json();
      router.push(`/quotes/${data.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (!initial?.id) {
      alert("Save the quote first before sending");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/quotes/${initial.id}/send`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to send");
        return;
      }
      router.push(`/quotes/${initial.id}`);
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  const previewData = {
    contactName,
    companyName,
    customerMessage,
    terms,
    validUntil,
    lineItems,
    subtotal: totals.subtotal,
    discountAmount,
    taxRate,
    taxAmount: totals.taxAmount,
    total: totals.total,
    quoteNumber: initial?.quoteNumber ?? "RB-DRAFT",
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* LEFT PANEL */}
        <div className="space-y-4">
          {/* Pricing Tier Toggle */}
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium">Pricing Tier</p>
                <p className="text-xs text-muted-foreground">
                  {pricingTier === "RETAIL"
                    ? "Using retail prices for end customers"
                    : "Using wholesale prices for trade/dealers"}
                </p>
              </div>
              <div className="flex rounded-lg bg-secondary p-1">
                <button
                  onClick={() => setPricingTier("RETAIL")}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                    pricingTier === "RETAIL"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Retail
                </button>
                <button
                  onClick={() => setPricingTier("WHOLESALE")}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                    pricingTier === "WHOLESALE"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Wholesale
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Contact Link */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium">Link to Contact</p>
              </div>
              {selectedContactId ? (
                <div className="mt-2 flex items-center gap-2">
                  <a
                    href={`/contacts/${selectedContactId}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-foreground hover:bg-secondary/80"
                  >
                    {selectedContactName}
                    <ExternalLink className="size-3" />
                  </a>
                  <button onClick={clearContact} className="text-muted-foreground hover:text-destructive">
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="relative mt-2">
                  <input
                    type="text"
                    value={contactSearch}
                    onChange={(e) => {
                      setContactSearch(e.target.value);
                      searchContacts(e.target.value);
                    }}
                    onFocus={() => contactResults.length > 0 && setShowContactDropdown(true)}
                    onBlur={() => setTimeout(() => setShowContactDropdown(false), 200)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Search contacts by name or email..."
                  />
                  {showContactDropdown && contactResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border bg-card shadow-lg">
                      {contactResults.map((c) => (
                        <button
                          key={c.id}
                          onMouseDown={() => selectContact(c)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-secondary/60"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{c.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {c.email}{c.company ? ` — ${c.company}` : ""}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Or enter customer info manually below
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Contact Name *</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Email *</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Phone</label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Company</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Customer Message</label>
                  <textarea
                    value={customerMessage}
                    onChange={(e) => setCustomerMessage(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Message shown to customer on the quote..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Valid Until</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Line Items</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setShowSkuModal(true)}>
                  <Package className="mr-1.5 size-3" />
                  Add from SKU Catalog
                </Button>
                <Button size="sm" variant="outline" onClick={addCustomItem}>
                  <Plus className="mr-1.5 size-3" />
                  Custom Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {lineItems.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Package className="mx-auto mb-3 size-8 opacity-40" />
                  <p className="text-sm">No line items yet</p>
                  <p className="mt-1 text-xs">Add items from the SKU catalog or create custom entries</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lineItems.map((item, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => setDragIndex(index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIndex !== null && dragIndex !== index) {
                          moveItem(dragIndex, index);
                        }
                        setDragIndex(null);
                      }}
                      className={cn(
                        "rounded-xl border bg-secondary/20 p-3 transition-colors",
                        dragIndex === index ? "border-primary bg-primary/5" : "hover:border-border",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-2 cursor-grab text-muted-foreground/40 hover:text-muted-foreground">
                          <GripVertical className="size-4" />
                        </div>

                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="size-10 shrink-0 rounded bg-muted object-cover"
                          />
                        ) : (
                          <div className="flex size-10 shrink-0 items-center justify-center rounded bg-secondary text-muted-foreground">
                            <Package className="size-4" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateItem(index, { name: e.target.value })}
                              placeholder="Item name"
                              className="flex-1 rounded-lg border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                            {item.skuCode && (
                              <Badge variant="secondary">{item.skuCode}</Badge>
                            )}
                          </div>
                          <input
                            type="text"
                            value={item.description ?? ""}
                            onChange={(e) => updateItem(index, { description: e.target.value })}
                            placeholder="Description (optional)"
                            className="w-full rounded-lg border bg-background px-2 py-1 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          />

                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">$</span>
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  updateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })
                                }
                                className="w-24 rounded-lg border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                step="0.01"
                                min="0"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">Qty</span>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(index, { quantity: parseInt(e.target.value) || 1 })
                                }
                                className="w-16 rounded-lg border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                min="1"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">Disc %</span>
                              <input
                                type="number"
                                value={item.discount}
                                onChange={(e) =>
                                  updateItem(index, { discount: parseFloat(e.target.value) || 0 })
                                }
                                className="w-16 rounded-lg border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                min="0"
                                max="100"
                              />
                            </div>
                            <span className="ml-auto font-medium text-sm">
                              $
                              {(
                                item.unitPrice *
                                item.quantity *
                                (1 - item.discount / 100)
                              ).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-4 pt-1">
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={item.customerCanEditQty}
                                onChange={(e) =>
                                  updateItem(index, { customerCanEditQty: e.target.checked })
                                }
                                className="rounded"
                              />
                              Customer can edit qty
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={item.isOptional}
                                onChange={(e) =>
                                  updateItem(index, { isOptional: e.target.checked })
                                }
                                className="rounded"
                              />
                              Optional item
                            </label>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="mt-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals */}
              {lineItems.length > 0 && (
                <div className="mt-4 space-y-2 border-t pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">
                      ${totals.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Discount $</span>
                      <input
                        type="number"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                        className="w-24 rounded-lg border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <span className="text-destructive">
                      -${discountAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Tax %</span>
                      <input
                        type="number"
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                        className="w-16 rounded-lg border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </div>
                    <span>
                      ${totals.taxAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2 text-base">
                    <span className="font-semibold">Grand Total</span>
                    <span className="text-lg font-bold">
                      ${totals.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes & Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Notes & Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Internal Notes <span className="text-xs text-muted-foreground">(not shown to customer)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Internal notes..."
                />
              </div>
              <div>
                <button
                  onClick={() => setTermsExpanded(!termsExpanded)}
                  className="flex w-full items-center justify-between text-sm font-medium"
                >
                  Terms & Conditions
                  {termsExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
                {termsExpanded && (
                  <textarea
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSave}
              disabled={saving || !contactName || !contactEmail || lineItems.length === 0}
            >
              <Save className="mr-1.5 size-4" />
              {saving ? "Saving..." : "Save as Draft"}
            </Button>

            {initial?.publicToken && (
              <a
                href={`/q/${initial.publicToken}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  <ExternalLink className="mr-1.5 size-4" />
                  Preview
                </Button>
              </a>
            )}

            {initial?.id && (
              <Button
                variant="secondary"
                onClick={handleSend}
                disabled={sending}
              >
                <Send className="mr-1.5 size-4" />
                {sending ? "Sending..." : "Send Quote"}
              </Button>
            )}
          </div>
        </div>

        {/* RIGHT PANEL — Live Preview */}
        <div className="hidden lg:block">
          <div className="sticky top-8">
            <div className="mb-2 text-center">
              <Badge variant="warning">Live Preview</Badge>
            </div>
            <Card className="max-h-[calc(100vh-120px)] overflow-y-auto">
              <QuotePreview data={previewData} />
            </Card>
          </div>
        </div>
      </div>

      {showSkuModal && (
        <SkuCatalogModal
          onSelect={addSkuItem}
          onClose={() => setShowSkuModal(false)}
        />
      )}
    </>
  );
}
