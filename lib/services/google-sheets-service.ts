import { google, type sheets_v4 } from "googleapis";
import path from "node:path";

// ── Auth & Client ───────────────────────────────────────────

let sheetsClient: sheets_v4.Sheets | null = null;

function getCredentialsPath(): string {
  const envPath = process.env.GOOGLE_CREDENTIALS_PATH;
  if (envPath) return path.resolve(envPath);
  return path.resolve(process.cwd(), "google-credentials.json");
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not set in env.");
  return id;
}

async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.GoogleAuth({
    keyFile: getCredentialsPath(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

// ── Read Operations ─────────────────────────────────────────

/** Read all values from a tab */
export async function readSheet(tabName: string): Promise<string[][]> {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: tabName,
  });
  return (res.data.values ?? []) as string[][];
}

/** Read a specific range (e.g., "Products!A1:F10") */
export async function readRange(range: string): Promise<string[][]> {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range,
  });
  return (res.data.values ?? []) as string[][];
}

/** Get all sheet/tab names in the spreadsheet */
export async function listSheetTabs(): Promise<string[]> {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    fields: "sheets.properties.title",
  });
  return (res.data.sheets ?? []).map((s) => s.properties?.title ?? "");
}

// ── Write Operations ────────────────────────────────────────

/** Overwrite an entire tab with new data (clears existing, then writes) */
export async function writeSheet(
  tabName: string,
  rows: (string | number | boolean | null)[][],
): Promise<{ updatedRows: number }> {
  const sheets = await getSheetsClient();

  // Clear existing data
  await sheets.spreadsheets.values.clear({
    spreadsheetId: getSpreadsheetId(),
    range: tabName,
  });

  // Write new data
  const res = await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${tabName}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: rows,
    },
  });

  return { updatedRows: res.data.updatedRows ?? 0 };
}

/** Append rows to the bottom of a tab */
export async function appendRows(
  tabName: string,
  rows: (string | number | boolean | null)[][],
): Promise<{ updatedRows: number }> {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: `${tabName}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: rows,
    },
  });

  return { updatedRows: res.data.updates?.updatedRows ?? 0 };
}

/** Update a specific range (e.g., "Products!A2:F2") */
export async function updateRange(
  range: string,
  rows: (string | number | boolean | null)[][],
): Promise<{ updatedCells: number }> {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: rows,
    },
  });

  return { updatedCells: res.data.updatedCells ?? 0 };
}

/** Update a single cell */
export async function updateCell(
  tabName: string,
  cell: string,
  value: string | number | boolean,
): Promise<void> {
  await updateRange(`${tabName}!${cell}`, [[value]]);
}
