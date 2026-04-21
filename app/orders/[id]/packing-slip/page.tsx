import { notFound } from "next/navigation";
import { getOrder } from "@/lib/services/order-service";
import { PackingSlipClient } from "@/components/orders/packing-slip-client";

export const dynamic = "force-dynamic";

export default async function PackingSlipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  return <PackingSlipClient order={order as never} />;
}
