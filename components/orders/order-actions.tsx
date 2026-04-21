"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Truck, Printer, ScanBarcode, Factory, PackageCheck,
  XCircle, RotateCcw, MapPin, Package, FileText, Pencil, Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { OrderStatusType } from "@/lib/schemas/order";

type OrderForActions = {
  id: string;
  orderNumber: string;
  status: OrderStatusType;
  shipToName: string | null;
  shipToCompany: string | null;
  shipToAddress1: string | null;
  shipToAddress2: string | null;
  shipToCity: string | null;
  shipToState: string | null;
  shipToZip: string | null;
  shipToCountry: string;
  addressVerified: boolean;
  weightLbs: number | null;
  weightOz: number | null;
  dimLength: number | null;
  dimWidth: number | null;
  dimHeight: number | null;
  packageType: string | null;
  carrier: string | null;
  serviceLevel: string | null;
  shippingRate: number | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  shippingCost: number;
  contactId: string | null;
  contact: { id: string; name: string; company: string | null; email: string | null; phone: string | null } | null;
  invoice: { id: string; invoiceNumber: string } | null;
  quote: { id: string; quoteNumber: string } | null;
  productionNotes: string | null;
  packingNotes: string | null;
};

export function OrderActions({ order }: { order: OrderForActions }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [editingPackage, setEditingPackage] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);

  // Address fields
  const [addr, setAddr] = useState({
    shipToName: order.shipToName || "",
    shipToCompany: order.shipToCompany || "",
    shipToAddress1: order.shipToAddress1 || "",
    shipToAddress2: order.shipToAddress2 || "",
    shipToCity: order.shipToCity || "",
    shipToState: order.shipToState || "",
    shipToZip: order.shipToZip || "",
  });

  // Package fields
  const [pkg, setPkg] = useState({
    weightLbs: order.weightLbs || 0,
    weightOz: order.weightOz || 0,
    dimLength: order.dimLength || 0,
    dimWidth: order.dimWidth || 0,
    dimHeight: order.dimHeight || 0,
  });

  // Notes fields
  const [notes, setNotes] = useState({
    productionNotes: order.productionNotes || "",
    packingNotes: order.packingNotes || "",
  });

  async function doAction(action: string, url: string, body?: unknown) {
    setLoading(action);
    try {
      const res = await fetch(url, {
        method: body ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || `Failed: ${action}`);
        return null;
      }
      router.refresh();
      return await res.json();
    } finally {
      setLoading(null);
    }
  }

  async function handleStatusChange(status: OrderStatusType) {
    if (status === "CANCELLED" && !confirm("Cancel this order?")) return;
    await doAction(status, `/api/orders/${order.id}/status`, { status });
  }

  async function saveAddress() {
    await doAction("address", `/api/orders/${order.id}/address`, addr);
    setEditingAddress(false);
  }

  async function savePackage() {
    await doAction("package", `/api/orders/${order.id}/package`, pkg);
    setEditingPackage(false);
  }

  async function saveNotes() {
    await doAction("notes", `/api/orders/${order.id}/notes`, notes);
    setEditingNotes(false);
  }

  async function verifyAddress() {
    await doAction("verify", `/api/orders/${order.id}/verify-address`, {
      name: order.shipToName,
      company: order.shipToCompany,
      street1: order.shipToAddress1,
      street2: order.shipToAddress2,
      city: order.shipToCity,
      state: order.shipToState,
      zip: order.shipToZip,
      country: order.shipToCountry,
    });
  }

  const canShip = ["READY_TO_SHIP", "LABEL_PURCHASED"].includes(order.status);
  const canCancel = !["SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED"].includes(order.status);
  const canReturn = order.status === "DELIVERED";

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <Card>
        <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {canShip && (
            <Link href={`/orders/${order.id}/ship`}>
              <Button className="w-full justify-start">
                <Truck className="mr-2 size-4" /> Ship This Order
              </Button>
            </Link>
          )}
          {order.labelUrl && (
            <a href={order.labelUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full justify-start">
                <Printer className="mr-2 size-4" /> Print Label
              </Button>
            </a>
          )}
          <Link href={`/orders/${order.id}/packing-slip`} target="_blank">
            <Button variant="outline" className="w-full justify-start">
              <FileText className="mr-2 size-4" /> Print Packing Slip
            </Button>
          </Link>
          <Link href={`/orders/${order.id}/verify`}>
            <Button variant="outline" className="w-full justify-start">
              <ScanBarcode className="mr-2 size-4" /> Verify Items
            </Button>
          </Link>
          {order.status === "PENDING" && (
            <Button variant="outline" className="w-full justify-start" onClick={() => handleStatusChange("IN_PRODUCTION")} disabled={loading === "IN_PRODUCTION"}>
              <Factory className="mr-2 size-4" /> Mark In Production
            </Button>
          )}
          {order.status === "IN_PRODUCTION" && (
            <Button variant="outline" className="w-full justify-start" onClick={() => handleStatusChange("QUALITY_CHECK")} disabled={loading === "QUALITY_CHECK"}>
              <PackageCheck className="mr-2 size-4" /> Mark Quality Check
            </Button>
          )}
          {order.status === "QUALITY_CHECK" && (
            <Button variant="outline" className="w-full justify-start" onClick={() => handleStatusChange("READY_TO_SHIP")} disabled={loading === "READY_TO_SHIP"}>
              <Package className="mr-2 size-4" /> Mark Ready to Ship
            </Button>
          )}
          {order.status === "LABEL_PURCHASED" && (
            <Button variant="outline" className="w-full justify-start" onClick={() => handleStatusChange("SHIPPED")} disabled={loading === "SHIPPED"}>
              <Truck className="mr-2 size-4" /> Mark Shipped
            </Button>
          )}
          {canReturn && (
            <Button variant="outline" className="w-full justify-start" onClick={() => handleStatusChange("RETURNED")} disabled={loading === "RETURNED"}>
              <RotateCcw className="mr-2 size-4" /> Create Return
            </Button>
          )}
          {canCancel && (
            <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => handleStatusChange("CANCELLED")} disabled={loading === "CANCELLED"}>
              <XCircle className="mr-2 size-4" /> Cancel Order
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Ship To Address */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ship To</CardTitle>
          <div className="flex gap-1">
            {!editingAddress && order.shipToAddress1 && (
              <Button variant="outline" size="sm" onClick={verifyAddress} disabled={loading === "verify"}>
                <MapPin className="mr-1 size-3" /> {order.addressVerified ? "Verified" : "Verify"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => editingAddress ? saveAddress() : setEditingAddress(true)}>
              {editingAddress ? <><Check className="mr-1 size-3" /> Save</> : <><Pencil className="mr-1 size-3" /> Edit</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {editingAddress ? (
            <div className="space-y-2">
              <Input placeholder="Name" value={addr.shipToName} onChange={(e) => setAddr({ ...addr, shipToName: e.target.value })} />
              <Input placeholder="Company" value={addr.shipToCompany} onChange={(e) => setAddr({ ...addr, shipToCompany: e.target.value })} />
              <Input placeholder="Address" value={addr.shipToAddress1} onChange={(e) => setAddr({ ...addr, shipToAddress1: e.target.value })} />
              <Input placeholder="Address 2" value={addr.shipToAddress2} onChange={(e) => setAddr({ ...addr, shipToAddress2: e.target.value })} />
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="City" value={addr.shipToCity} onChange={(e) => setAddr({ ...addr, shipToCity: e.target.value })} />
                <Input placeholder="State" value={addr.shipToState} onChange={(e) => setAddr({ ...addr, shipToState: e.target.value })} />
                <Input placeholder="Zip" value={addr.shipToZip} onChange={(e) => setAddr({ ...addr, shipToZip: e.target.value })} />
              </div>
            </div>
          ) : (
            <>
              {order.shipToName && <p className="font-medium">{order.shipToName}</p>}
              {order.shipToCompany && <p>{order.shipToCompany}</p>}
              {order.shipToAddress1 && <p>{order.shipToAddress1}</p>}
              {order.shipToAddress2 && <p>{order.shipToAddress2}</p>}
              {order.shipToCity && (
                <p>{order.shipToCity}, {order.shipToState} {order.shipToZip}</p>
              )}
              {order.addressVerified && (
                <Badge variant="success" className="mt-1"><Check className="mr-1 size-3" /> Address Verified</Badge>
              )}
              {!order.shipToAddress1 && <p className="text-muted-foreground">No address set</p>}
            </>
          )}
        </CardContent>
      </Card>

      {/* Package Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Package</CardTitle>
          <Button variant="outline" size="sm" onClick={() => editingPackage ? savePackage() : setEditingPackage(true)}>
            {editingPackage ? <><Check className="mr-1 size-3" /> Save</> : <><Pencil className="mr-1 size-3" /> Edit</>}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {editingPackage ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Weight (lbs)</label>
                  <Input type="number" min="0" step="0.1" value={pkg.weightLbs} onChange={(e) => setPkg({ ...pkg, weightLbs: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Weight (oz)</label>
                  <Input type="number" min="0" step="0.1" value={pkg.weightOz} onChange={(e) => setPkg({ ...pkg, weightOz: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">L (in)</label>
                  <Input type="number" min="0" step="0.1" value={pkg.dimLength} onChange={(e) => setPkg({ ...pkg, dimLength: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">W (in)</label>
                  <Input type="number" min="0" step="0.1" value={pkg.dimWidth} onChange={(e) => setPkg({ ...pkg, dimWidth: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">H (in)</label>
                  <Input type="number" min="0" step="0.1" value={pkg.dimHeight} onChange={(e) => setPkg({ ...pkg, dimHeight: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weight</span>
                <span className="font-medium">
                  {order.weightLbs || order.weightOz
                    ? `${order.weightLbs || 0} lbs ${order.weightOz || 0} oz`
                    : "Not set"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dimensions</span>
                <span className="font-medium">
                  {order.dimLength
                    ? `${order.dimLength}" × ${order.dimWidth}" × ${order.dimHeight}"`
                    : "Not set"}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Shipping Info */}
      {order.carrier && (
        <Card>
          <CardHeader><CardTitle>Shipping</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Carrier</span>
              <span className="font-medium">{order.carrier}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service</span>
              <span>{order.serviceLevel}</span>
            </div>
            {order.trackingNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tracking</span>
                <span className="font-mono text-xs">{order.trackingNumber}</span>
              </div>
            )}
            {order.shippingRate != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate</span>
                <span className="font-medium">${order.shippingRate.toFixed(2)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Notes</CardTitle>
          <Button variant="outline" size="sm" onClick={() => editingNotes ? saveNotes() : setEditingNotes(true)}>
            {editingNotes ? <><Check className="mr-1 size-3" /> Save</> : <><Pencil className="mr-1 size-3" /> Edit</>}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {editingNotes ? (
            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Production Notes</label>
                <textarea
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  rows={3}
                  value={notes.productionNotes}
                  onChange={(e) => setNotes({ ...notes, productionNotes: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Packing Notes</label>
                <textarea
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  rows={3}
                  value={notes.packingNotes}
                  onChange={(e) => setNotes({ ...notes, packingNotes: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <>
              {order.productionNotes ? (
                <div>
                  <p className="text-xs text-muted-foreground">Production</p>
                  <p className="whitespace-pre-wrap">{order.productionNotes}</p>
                </div>
              ) : null}
              {order.packingNotes ? (
                <div>
                  <p className="text-xs text-muted-foreground">Packing</p>
                  <p className="whitespace-pre-wrap">{order.packingNotes}</p>
                </div>
              ) : null}
              {!order.productionNotes && !order.packingNotes && (
                <p className="text-muted-foreground">No notes</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Contact */}
      {order.contact && (
        <Card>
          <CardContent className="space-y-1 p-4 text-sm">
            <p className="text-muted-foreground">Contact</p>
            <Link href={`/contacts/${order.contact.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
              {order.contact.name}
            </Link>
            {order.contact.email && <p className="text-muted-foreground">{order.contact.email}</p>}
            {order.contact.phone && <p className="text-muted-foreground">{order.contact.phone}</p>}
          </CardContent>
        </Card>
      )}

      {/* Invoice */}
      {order.invoice && (
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="text-muted-foreground">Source Invoice</p>
            <Link href={`/invoices/${order.invoice.id}`} className="text-primary underline-offset-4 hover:underline">
              {order.invoice.invoiceNumber}
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Quote */}
      {order.quote && (
        <Card>
          <CardContent className="p-4 text-sm">
            <p className="text-muted-foreground">Source Quote</p>
            <Link href={`/quotes/${order.quote.id}`} className="text-primary underline-offset-4 hover:underline">
              {order.quote.quoteNumber}
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
