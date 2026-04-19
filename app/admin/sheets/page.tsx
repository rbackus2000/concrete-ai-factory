import { PageHeader } from "@/components/app-shell/page-header";
import { listSheetTabs } from "@/lib/services/google-sheets-service";
import { SheetsSyncClient } from "./sheets-sync-client";

export const dynamic = "force-dynamic";

export default async function SheetsPage() {
  let tabs: string[] = [];
  let error: string | null = null;

  try {
    tabs = await listSheetTabs();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to connect to Google Sheets.";
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Google Sheets Sync"
        description="Push app data to your Google Sheet — products, pricing, costing, orders, and capacity."
      />
      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">
          <p className="font-medium">Connection Error</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-xs text-red-500">
            Check that google-credentials.json exists and GOOGLE_SHEETS_SPREADSHEET_ID is set in .env.local.
            Make sure the sheet is shared with the service account email.
          </p>
        </div>
      ) : (
        <SheetsSyncClient tabs={tabs} />
      )}
    </div>
  );
}
