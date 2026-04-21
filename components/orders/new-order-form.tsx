"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Contact = {
  id: string;
  name: string;
  company: string | null;
  email: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

type InventoryItem = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  imageUrl: string | null;
  costPerUnit: number;
};

type LineItem = {
  name: string;
  description: string;
  sku: string;
  barcode: string;
  imageUrl: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  inventoryItemId: string;
  sortOrder: number;
};

export function NewOrderForm({
  contacts,
  inventoryItems,
}: {
  contacts: Contact[];
  inventoryItems: InventoryItem[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Contact
  const [contactId, setContactId] = useState("");
  const selectedContact = contacts.find((c) => c.id === contactId);

  // Ship To
  const [shipToName, setShipToName] = useState("");
  const [shipToCompany, setShipToCompany] = useState("");
  const [shipToAddress1, setShipToAddress1] = useState("");
  const [shipToAddress2, setShipToAddress2] = useState("");
  const [shipToCity, setShipToCity] = useState("");
  const [shipToState, setShipToState] = useState("");
  const [shipToZip, setShipToZip] = useState("");
  const [shipByDate, setShipByDate] = useState("");
  const [productionNotes, setProductionNotes] = useState("");

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  function handleContactChange(id: string) {
    setContactId(id);
    const c = contacts.find((ct) => ct.id === id);
    if (c) {
      setShipToName(c.name);
      setShipToCompany(c.company || "");
      setShipToAddress1(c.address || "");
      setShipToCity(c.city || "");
      setShipToState(c.state || "");
      setShipToZip(c.zip || "");
    }
  }

  function addLineItem(itemId: string) {
    const item = inventoryItems.find((i) => i.id === itemId);
    if (!item) return;

    setLineItems((prev) => [
      ...prev,
      {
        name: item.name,
        description: "",
        sku: item.sku || "",
        barcode: item.barcode || "",
        imageUrl: item.imageUrl || "",
        quantity: 1,
        unitPrice: item.costPerUnit,
        lineTotal: item.costPerUnit,
        inventoryItemId: item.id,
        sortOrder: prev.length,
      },
    ]);
  }

  function addCustomLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        name: "",
        description: "",
        sku: "",
        barcode: "",
        imageUrl: "",
        quantity: 1,
        unitPrice: 0,
        lineTotal: 0,
        inventoryItemId: "",
        sortOrder: prev.length,
      },
    ]);
  }

  function updateLineItem(index: number, field: string, value: string | number) {
    setLineItems((prev) => {
      const items = [...prev];
      const item = { ...items[index], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        item.lineTotal = item.quantity * item.unitPrice;
      }
      items[index] = item;
      return items;
    });
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  const orderTotal = lineItems.reduce((sum, li) => sum + li.lineTotal, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (lineItems.length === 0) {
      setError("Add at least one line item");
      return;
    }

    if (lineItems.some((li) => !li.name)) {
      setError("All line items need a name");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contactId || undefined,
          shipToName,
          shipToCompany,
          shipToAddress1,
          shipToAddress2,
          shipToCity,
          shipToState,
          shipToZip,
          shipToCountry: "US",
          shipByDate: shipByDate || undefined,
          productionNotes,
          packingNotes: "",
          lineItems,
          orderTotal,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create order");
        return;
      }

      const { data } = await res.json();
      router.push(`/orders/${data.id}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contact Selection */}
      <Card>
        <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Select Contact</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={contactId}
              onChange={(e) => handleContactChange(e.target.value)}
            >
              <option value="">Select a contact...</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company ? ` — ${c.company}` : ""}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Ship To */}
      <Card>
        <CardHeader><CardTitle>Ship To</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input value={shipToName} onChange={(e) => setShipToName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Company</label>
              <Input value={shipToCompany} onChange={(e) => setShipToCompany(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Address</label>
            <Input value={shipToAddress1} onChange={(e) => setShipToAddress1(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Address 2</label>
            <Input value={shipToAddress2} onChange={(e) => setShipToAddress2(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">City</label>
              <Input value={shipToCity} onChange={(e) => setShipToCity(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">State</label>
              <Input value={shipToState} onChange={(e) => setShipToState(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Zip</label>
              <Input value={shipToZip} onChange={(e) => setShipToZip(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Ship By Date</label>
              <Input type="date" value={shipByDate} onChange={(e) => setShipByDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <div className="flex gap-2">
            <select
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              value=""
              onChange={(e) => { if (e.target.value) addLineItem(e.target.value); e.target.value = ""; }}
            >
              <option value="">Add product...</option>
              {inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}{item.sku ? ` (${item.sku})` : ""}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" size="sm" onClick={addCustomLineItem}>
              <Plus className="mr-1 size-3" /> Custom Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {lineItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No items added yet. Select a product or add a custom item.
            </p>
          ) : (
            <div className="space-y-3">
              {lineItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-[1fr_80px_100px_100px]">
                      <Input
                        placeholder="Item name"
                        value={item.name}
                        onChange={(e) => updateLineItem(i, "name", e.target.value)}
                      />
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(i, "quantity", parseInt(e.target.value) || 1)}
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(i, "unitPrice", parseFloat(e.target.value) || 0)}
                      />
                      <p className="flex items-center justify-end text-sm font-medium">
                        ${item.lineTotal.toFixed(2)}
                      </p>
                    </div>
                    {item.sku && (
                      <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeLineItem(i)}
                    className="shrink-0"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-end border-t pt-3 text-base font-bold">
                <span>Total: ${orderTotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader><CardTitle>Production Notes</CardTitle></CardHeader>
        <CardContent>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            rows={3}
            placeholder="Any special production instructions..."
            value={productionNotes}
            onChange={(e) => setProductionNotes(e.target.value)}
          />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Order"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
