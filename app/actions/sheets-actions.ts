"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth/session";
import {
  syncAllToSheet,
  syncProductsToSheet,
  syncPricingToSheet,
  syncCapacityToSheet,
  syncInventoryToSheet,
  syncOrdersToSheet,
  syncCostingToSheet,
  syncDashboardToSheet,
} from "@/lib/services/sheets-sync-service";
import { listSheetTabs, readSheet } from "@/lib/services/google-sheets-service";

export async function syncAllSheetsAction() {
  await requireAdminSession();
  const results = await syncAllToSheet();
  revalidatePath("/admin/sheets");
  return results;
}

export async function syncSheetTabAction(tab: string) {
  await requireAdminSession();

  const syncMap: Record<string, () => Promise<unknown>> = {
    Products: syncProductsToSheet,
    Pricing: syncPricingToSheet,
    Capacity: syncCapacityToSheet,
    Inventory: syncInventoryToSheet,
    Orders: syncOrdersToSheet,
    Costing: syncCostingToSheet,
    Dashboard: syncDashboardToSheet,
  };

  const syncFn = syncMap[tab];
  if (!syncFn) throw new Error(`No sync function for tab: ${tab}`);

  const result = await syncFn();
  revalidatePath("/admin/sheets");
  return result;
}

export async function getSheetTabsAction() {
  await requireAdminSession();
  return listSheetTabs();
}

export async function readSheetTabAction(tabName: string) {
  await requireAdminSession();
  return readSheet(tabName);
}
