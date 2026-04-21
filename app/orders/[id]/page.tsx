import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Clock, Truck, Package, AlertTriangle, CheckCircle2,
  Factory, ScanBarcode, Tag, RotateCcw, XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getOrder } from "@/lib/services/order-service";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderStatusTimeline } from "@/components/orders/order-status-timeline";
import { OrderActions } from "@/components/orders/order-actions";
import type { OrderStatusType } from "@/lib/schemas/order";

export const dynamic = "force-dynamic";

const EVENT_ICONS: Record<string, typeof Clock> = {
  CREATED: Clock,
  STATUS_CHANGED: Tag,
  LABEL_PURCHASED: Truck,
  SHIPPED: Truck,
  RETURN_INITIATED: RotateCcw,
  EXCEPTION: AlertTriangle,
  CANCELLED: XCircle,
  VERIFIED: ScanBarcode,
};

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(d: Date | string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const verifiedCount = order.lineItems.filter((li) => li.isVerified).length;
  const totalItems = order.lineItems.length;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Orders"
          title={order.orderNumber}
          description={`${order.contact?.name || "No contact"}${order.contact?.company ? ` — ${order.contact.company}` : ""}`}
        />
        <div className="flex items-center gap-3">
          <OrderStatusBadge status={order.status as OrderStatusType} />
          <Link href="/orders">
            <Button variant="outline">Back to Orders</Button>
          </Link>
        </div>
      </div>

      {/* Status Timeline */}
      <OrderStatusTimeline
        status={order.status as OrderStatusType}
        events={order.events}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* LEFT */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Order Total</p>
                <p className="text-xl font-bold">{fmt(order.orderTotal)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Items</p>
                <p className="text-xl font-bold">{totalItems}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className={`text-xl font-bold ${verifiedCount === totalItems && totalItems > 0 ? "text-emerald-600" : ""}`}>
                  {verifiedCount}/{totalItems}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Shipping Cost</p>
                <p className="text-xl font-bold">{order.shippingCost > 0 ? fmt(order.shippingCost) : "—"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Line Items */}
          <Card>
            <CardHeader><CardTitle>Line Items ({totalItems})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12" />
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Verified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="size-10 rounded object-cover" />
                        ) : (
                          <div className="flex size-10 items-center justify-center rounded bg-secondary">
                            <Package className="size-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{item.name}</span>
                        {item.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.sku || "—"}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{fmt(item.unitPrice)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(item.lineTotal)}</TableCell>
                      <TableCell>
                        {item.isVerified ? (
                          <Badge variant="success"><CheckCircle2 className="mr-1 size-3" /> Verified</Badge>
                        ) : item.qtyVerified > 0 ? (
                          <Badge variant="warning">{item.qtyVerified}/{item.quantity}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not verified</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 space-y-1 border-t pt-4 text-sm">
                <div className="flex justify-between border-t pt-2 text-base font-bold">
                  <span>Order Total</span>
                  <span>{fmt(order.orderTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tracking Timeline */}
          {order.trackingEvents.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Tracking Timeline</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {order.trackingEvents.map((te) => (
                  <div key={te.id} className="flex gap-3 text-sm">
                    <div className="mt-0.5 rounded-full bg-secondary p-1.5">
                      <Truck className="size-3 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{te.message}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{fmtDateTime(te.datetime)}</span>
                        {te.location && <span>· {te.location}</span>}
                        {te.source && <span>· {te.source}</span>}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 self-start">{te.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Returns */}
          {order.returns.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Returns</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Label</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.returns.map((ret) => (
                      <TableRow key={ret.id}>
                        <TableCell className="text-muted-foreground">{fmtDate(ret.createdAt)}</TableCell>
                        <TableCell>{ret.reason}</TableCell>
                        <TableCell><Badge variant="secondary">{ret.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{ret.trackingNumber || "—"}</TableCell>
                        <TableCell>
                          {ret.returnLabelUrl ? (
                            <a href={ret.returnLabelUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline text-xs">
                              Download
                            </a>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Event Log */}
          <Card>
            <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {order.events.map((event) => {
                const Icon = EVENT_ICONS[event.event] ?? Clock;
                let detail = event.event;
                if (event.metadata) {
                  try {
                    const meta = JSON.parse(event.metadata);
                    if (meta.from && meta.to) detail = `${meta.from} → ${meta.to}`;
                  } catch { /* ignore */ }
                }
                return (
                  <div key={event.id} className="flex gap-3 text-sm">
                    <div className="mt-0.5 rounded-full bg-secondary p-1.5">
                      <Icon className="size-3 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{detail}</p>
                      <p className="text-xs text-muted-foreground">{fmtDateTime(event.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — Actions Panel */}
        <OrderActions order={order as never} />
      </div>
    </div>
  );
}
