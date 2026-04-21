import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getOrder } from "@/lib/services/order-service";
import { VerifyOrderClient } from "@/components/orders/verify-order-client";

export const dynamic = "force-dynamic";

export default async function VerifyOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  return <VerifyOrderClient order={order as never} />;
}
