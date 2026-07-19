/**
 * lib/importParsers.ts — Sprint E Stage R3: pure CSV -> parsed-receipt
 * mapping for the two manual backfill sources (Amazon "Request My Data" and
 * DoorDash order export).
 *
 * ARCHITECTURE NOTE: PURE functions only — no React, no Supabase, no
 * network, no LLM — mirroring lib/receiptMatch.ts's and lib/tripEngine.ts's
 * discipline. These files are already fully structured (unlike a photographed
 * receipt), so there is nothing for Haiku to extract: this module hand-rolls
 * the CSV decode and groups rows into the same
 * `{ merchant, orderDate, currency, items, totalUsd, confidence }` shape
 * receipt-parse's Haiku path produces, so the edge function's `preParsed`
 * input (see supabase/functions/receipt-parse/index.ts) can skip the model
 * call entirely for these two channels while reusing every other part of
 * the pipeline (idempotency, item-factor resolution, supersede-matching,
 * atomic entry claim).
 *
 * FORMAT VERIFICATION:
 *  - Amazon "Retail.OrderHistory.1.csv" column layout (Website, Order ID,
 *    Order Date, Purchase Order Number, Currency, Unit Price, Unit Price Tax,
 *    Shipping Charge, Total Discounts, Total Owed, Shipment Item Subtotal,
 *    Shipment Item Subtotal Tax, ASIN, Product Condition, Quantity, Payment
 *    Instrument Type, Order Status, Shipment Status, Ship Date, Shipping
 *    Option, Shipping Address, Billing Address, Carrier Name & Tracking
 *    Number, Product Name, Gift Message, Gift Sender Name, Gift Recipient
 *    Contact Details, Item Serial Number) confirmed against Amazon "Request
 *    My Data" documentation/community write-ups describing this exact,
 *    well-known fixed export — this is Amazon's stable "Your Orders"
 *    Privacy-Central export, not the older Order History Reports format.
 *  - CURRENCY: adversarial review found this file computed `priceUsd: unitPrice
 *    * qty` unconditionally, regardless of the row's own Currency column —
 *    mislabeling a non-USD line total as if it were USD. This module now
 *    checks `isSupportedCurrency` (lib/receiptValidation.ts, shared with the
 *    receipt-parse edge function's identical gate) per row and surfaces a
 *    warning when a non-USD currency is detected; the receipt-parse edge
 *    function is the actual enforcement point (it nulls out price_usd/
 *    kg_co2e for the whole order when `parsed.currency` isn't USD), so this
 *    is defense-in-depth plus user-visible transparency, not a silent
 *    pass-through.
 *  - DoorDash has NO publicly documented fixed consumer "Request My Data"
 *    CSV column layout (only the *business*-account export format, which
 *    has a different shape entirely, is documented). The DoorDash parser
 *    below is therefore deliberately HEADER-NAME-DRIVEN (looks up columns by
 *    matching header text against a list of known aliases) rather than
 *    fixed-position, so it degrades gracefully — and reports which
 *    header(s) it could not find — instead of silently misreading a column
 *    it has never actually seen a real sample of. Treat this as a
 *    best-effort implementation pending a real exported sample file.
 */

import { isSupportedCurrency } from './receiptValidation';

export interface ParsedImportItem {
  name: string;
  qty: number;
  priceUsd: number;
  categoryGuess: string | null;
}

export interface ParsedImportOrder {
  merchant: string;
  orderDate: string; // "YYYY-MM-DD"
  currency: string;
  items: ParsedImportItem[];
  totalUsd: number | null;
  confidence: number;
}

export interface CsvParseResult {
  orders: ParsedImportOrder[];
  /** Non-fatal issues (e.g. an unparseable row, a missing expected header) —
   * surfaced to the user rather than silently dropped. */
  warnings: string[];
}

// ─── Minimal RFC-4180-ish CSV line splitter ─────────────────────────────────
// Handles quoted fields containing commas/newlines/escaped quotes ("") —
// the small feature set both these exports actually use. Not a general CSV
// library (none is added — see task scope note), but sufficient for a
// well-known, fixed, comma-delimited export.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, '\n');

  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i];
    if (inQuotes) {
      if (c === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  // Trailing field/row (files don't always end with a newline)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

function toDateOnly(raw: string): string | null {
  // Already "YYYY-MM-DD" (or that prefix of an ISO timestamp) — return as-is,
  // never round-tripping through Date/local-timezone conversion (which can
  // shift a bare date backward/forward a day depending on the device's UTC
  // offset — the exact drift lib/emissions.ts's getLocalDateString note
  // warns about, except here we don't even have a "now" to localize).
  const isoMatch = raw.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  // Otherwise (e.g. "03/01/2024") parse at noon UTC before extracting the
  // date part, so no timezone can push it to the adjacent day.
  const d = new Date(`${raw.trim()} 12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function toNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.\-]/g, '');
  if (cleaned.length === 0) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// ─── Amazon "Retail.OrderHistory.1.csv" ─────────────────────────────────────

const AMAZON_HEADERS = {
  orderId: 'Order ID',
  orderDate: 'Order Date',
  productName: 'Product Name',
  quantity: 'Quantity',
  unitPrice: 'Unit Price',
  totalOwed: 'Total Owed',
  currency: 'Currency',
} as const;

export function parseAmazonOrderHistoryCsv(csvText: string): CsvParseResult {
  const warnings: string[] = [];
  const rows = parseCsv(csvText);
  if (rows.length < 2) return { orders: [], warnings: ['File is empty or has no data rows.'] };

  const header = rows[0].map((h) => h.trim());
  const colIndex: Record<string, number> = {};
  for (const [key, label] of Object.entries(AMAZON_HEADERS)) {
    const idx = header.findIndex((h) => h.toLowerCase() === label.toLowerCase());
    if (idx === -1) warnings.push(`Amazon CSV missing expected column "${label}" — some data may be incomplete.`);
    colIndex[key] = idx;
  }

  // Group line items by Order ID — one order can span multiple rows.
  const byOrderId = new Map<string, { orderDate: string | null; totalOwed: number | null; currency: string; items: ParsedImportItem[] }>();

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const orderId = colIndex.orderId >= 0 ? cells[colIndex.orderId] : undefined;
    const productName = colIndex.productName >= 0 ? cells[colIndex.productName] : undefined;
    if (!orderId || !productName) {
      warnings.push(`Row ${i + 1}: missing Order ID or Product Name — skipped.`);
      continue;
    }
    const orderDateRaw = colIndex.orderDate >= 0 ? cells[colIndex.orderDate] : undefined;
    const orderDate = orderDateRaw ? toDateOnly(orderDateRaw) : null;
    const qty = toNumber(colIndex.quantity >= 0 ? cells[colIndex.quantity] : undefined) ?? 1;
    const unitPrice = toNumber(colIndex.unitPrice >= 0 ? cells[colIndex.unitPrice] : undefined) ?? 0;
    const totalOwed = toNumber(colIndex.totalOwed >= 0 ? cells[colIndex.totalOwed] : undefined);
    const currency = (colIndex.currency >= 0 ? cells[colIndex.currency] : undefined) || 'USD';

    if (!byOrderId.has(orderId)) {
      byOrderId.set(orderId, { orderDate, totalOwed, currency, items: [] });
    }
    // CURRENCY GUARD: check before treating unitPrice*qty as a USD amount.
    // priceUsd is still populated (native-currency line total) so nothing is
    // silently dropped from the row, but a warning flags it explicitly and
    // the downstream receipt-parse function is the actual enforcement point
    // — it nulls price_usd/kg_co2e for the whole order once it sees this
    // order's `currency` isn't USD, rather than computing emissions off a
    // mislabeled amount.
    if (!isSupportedCurrency(currency)) {
      warnings.push(
        `Order ${orderId}: currency is "${currency}" (not USD) — priceUsd/totalOwed are in that native currency, not converted; emissions will not be computed for this order until currency conversion is supported.`
      );
    }
    byOrderId.get(orderId)!.items.push({
      name: productName.trim(),
      qty,
      priceUsd: unitPrice * qty,
      categoryGuess: null, // Amazon export has no category column — resolved server-side by item name only
    });
  }

  const orders: ParsedImportOrder[] = [];
  for (const [orderId, group] of byOrderId) {
    if (!group.orderDate) {
      warnings.push(`Order ${orderId}: unparseable or missing Order Date — skipped.`);
      continue;
    }
    orders.push({
      merchant: 'Amazon',
      orderDate: group.orderDate,
      currency: group.currency,
      items: group.items,
      totalUsd: group.totalOwed,
      confidence: 1, // structured, first-party export data — not a Haiku guess
    });
  }

  return { orders, warnings };
}

// ─── DoorDash order export ──────────────────────────────────────────────────
// See file header note: no confirmed fixed consumer column layout, so this
// resolves columns by matching header text against known aliases.
const DOORDASH_HEADER_ALIASES: Record<string, string[]> = {
  orderId: ['order id', 'order #', 'delivery id'],
  orderDate: ['date', 'order date', 'delivery date', 'timestamp', 'timestamp (utc)'],
  merchant: ['restaurant', 'merchant', 'store'],
  item: ['item', 'item name', 'product'],
  quantity: ['quantity', 'qty'],
  price: ['item price', 'price', 'subtotal'],
  total: ['total', 'order total', 'company paid'],
};

function findAliasIndex(header: string[], aliases: string[]): number {
  const lower = header.map((h) => h.trim().toLowerCase());
  for (const alias of aliases) {
    const idx = lower.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

export function parseDoorDashOrderExportCsv(csvText: string): CsvParseResult {
  const warnings: string[] = [];
  const rows = parseCsv(csvText);
  if (rows.length < 2) return { orders: [], warnings: ['File is empty or has no data rows.'] };

  const header = rows[0];
  const colIndex: Record<string, number> = {};
  for (const [key, aliases] of Object.entries(DOORDASH_HEADER_ALIASES)) {
    const idx = findAliasIndex(header, aliases);
    if (idx === -1) warnings.push(`DoorDash CSV: could not find a column for "${key}" (tried: ${aliases.join(', ')}).`);
    colIndex[key] = idx;
  }
  if (colIndex.orderDate === -1) {
    return { orders: [], warnings: [...warnings, 'DoorDash CSV: no recognizable date column — cannot import.'] };
  }

  const byOrderKey = new Map<string, { orderDate: string | null; merchant: string; total: number | null; items: ParsedImportItem[] }>();

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const orderDateRaw = cells[colIndex.orderDate];
    const orderDate = orderDateRaw ? toDateOnly(orderDateRaw) : null;
    if (!orderDate) {
      warnings.push(`Row ${i + 1}: unparseable date — skipped.`);
      continue;
    }
    const merchant = (colIndex.merchant >= 0 ? cells[colIndex.merchant] : undefined)?.trim() || 'DoorDash order';
    const orderKey = colIndex.orderId >= 0 ? cells[colIndex.orderId] : `${orderDate}__${merchant}`;
    const itemName = (colIndex.item >= 0 ? cells[colIndex.item] : undefined)?.trim() || merchant;
    const qty = toNumber(colIndex.quantity >= 0 ? cells[colIndex.quantity] : undefined) ?? 1;
    const price = toNumber(colIndex.price >= 0 ? cells[colIndex.price] : undefined) ?? 0;
    const total = toNumber(colIndex.total >= 0 ? cells[colIndex.total] : undefined);

    if (!byOrderKey.has(orderKey)) {
      byOrderKey.set(orderKey, { orderDate, merchant, total, items: [] });
    }
    byOrderKey.get(orderKey)!.items.push({
      name: itemName,
      qty,
      priceUsd: price * qty,
      categoryGuess: 'food delivery',
    });
  }

  const orders: ParsedImportOrder[] = [];
  for (const group of byOrderKey.values()) {
    orders.push({
      merchant: group.merchant,
      orderDate: group.orderDate!,
      currency: 'USD',
      items: group.items,
      totalUsd: group.total,
      confidence: 0.6, // header-alias-driven, unverified format — lower than Amazon's confirmed layout
    });
  }

  return { orders, warnings };
}
