import { getOptionalSession } from "@/lib/auth/session";
import { getAttentionCount } from "@/lib/services/quote-service";
import { getContactAttentionCount } from "@/lib/services/contact-service";
import { getInvoiceAttentionCount } from "@/lib/services/invoice-service";
import { getOrderAttentionCount } from "@/lib/services/order-service";
import { getInventoryAttentionCount } from "@/lib/services/inventory-service";
import { getPOAttentionCount } from "@/lib/services/purchase-order-service";
import { getMarketingAttentionCount } from "@/lib/services/marketing-service";

import { AppSidebarClient } from "./app-sidebar-client";

export async function AppSidebar() {
  const session = await getOptionalSession();
  let quoteAttentionCount = 0;
  let contactAttentionCount = 0;
  let invoiceAttentionCount = 0;
  let orderAttentionCount = 0;
  let inventoryAttentionCount = 0;
  let poAttentionCount = 0;
  let marketingAttentionCount = 0;
  try {
    [quoteAttentionCount, contactAttentionCount, invoiceAttentionCount, orderAttentionCount, inventoryAttentionCount, poAttentionCount, marketingAttentionCount] = await Promise.all([
      getAttentionCount(),
      getContactAttentionCount(),
      getInvoiceAttentionCount(),
      getOrderAttentionCount(),
      getInventoryAttentionCount(),
      getPOAttentionCount(),
      getMarketingAttentionCount(),
    ]);
  } catch {
    // DB may not be ready during build
  }

  return (
    <AppSidebarClient
      canAccessAdmin={session?.role === "ADMIN"}
      displayName={session?.displayName ?? "Internal user"}
      role={session?.role ?? "USER"}
      quoteAttentionCount={quoteAttentionCount}
      contactAttentionCount={contactAttentionCount}
      invoiceAttentionCount={invoiceAttentionCount}
      orderAttentionCount={orderAttentionCount}
      inventoryAttentionCount={inventoryAttentionCount}
      poAttentionCount={poAttentionCount}
      marketingAttentionCount={marketingAttentionCount}
    />
  );
}
