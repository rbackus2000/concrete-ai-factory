import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getOrder } from "@/lib/services/order-service";
import { ShipOrderClient } from "@/components/orders/ship-order-client";

export const dynamic = "force-dynamic";

export default async function ShipOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  return <ShipOrderClient order={order as never} />;
}
