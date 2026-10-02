// Parses a Reece maX price file (CSV or tab-separated) into supplier items.
//
// Reece has not published the file's column layout, and the partner apps that
// consume it each describe it differently, so this does not hard-code headers.
// It recognises the common names for each field, reports which column it chose
// for what, and refuses only when it cannot find a code and a price. The
// response of /api/reece/import shows that mapping, so a wrong guess is visible
// on the dry run rather than silently landing in the pricebook. An explicit
// mapping can be pinned in portal_settings.pricebook.fileColumns once the real
// headers are known.
//
// Excel exports are not read here — save the sheet as CSV first.

export type ParsedItem = {
  code: string;
  description: string | null;
  uom: string | null;
  pack_qty: number | null;
  cost: number | null;
  gst_applies: boolean;
  list_price: number | null;
  category: string | null;
  barcode: string | null;
  raw: Record<string, string>;
};

export type ColumnMap = Partial<Record<Field, string>>;

type Field = "code" | "description" | "cost" | "gst" | "uom" | "pack_qty" | "list_price" | "category" | "barcode";

// Order matters within each list: the first header that matches wins.
const SYNONYMS: Record<Field, string[]> = {
  code: ["reece code", "product code", "item code", "product number", "product no", "item number", "item no", "part number", "part no", "sku", "code", "item"],
  description: ["product description", "item description", "description", "product name", "item name", "name", "product"],
  cost: ["your price ex gst", "your price (ex gst)", "your price", "net price", "trade price ex gst", "trade price", "price ex gst", "price (ex gst)", "ex gst price", "net", "unit price", "price", "cost"],
  gst: ["gst applicable", "gst applies", "gst", "taxable", "tax code", "tax"],
  uom: ["unit of measure", "uom", "unit", "units", "sell unit"],
  pack_qty: ["pack qty", "pack quantity", "pack size", "pack", "qty per pack", "multiple"],
  list_price: ["list price ex gst", "list price", "rrp", "recommended retail", "retail price", "list"],
  category: ["product group", "category", "group", "range"],
  barcode: ["barcode", "ean", "gtin", "upc"],
};

const normHeader = (h: string) =>
  h.trim().toLowerCase().replace(/[_\-()[\]{}.:]+/g, " ").replace(/\s+/g, " ").trim();

// Second-pass order: fields whose names are a superset of another's ("list
// price" ⊃ "price") go first so the looser match cannot steal their column.
const CONTAINS_ORDER: Field[] = ["list_price", "pack_qty", "code", "description", "cost", "gst", "uom", "category", "barcode"];

const containsWords = (header: string, synonym: string) => new RegExp(`(^| )${synonym}( |$)`).test(header);

export function parseDelimited(text: string): { headers: string[]; rows: string[][]; delimiter: string } {
  // Strip a UTF-8 BOM, which Excel writes and which would end up glued to the first header.
  const src = text.replace(/^﻿/, "");
  const firstLine = src.slice(0, src.indexOf("\n") === -1 ? src.length : src.indexOf("\n"));
  const delimiter = (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? "\t" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);

  const headers = (rows.shift() ?? []).map((h) => h.trim());
  return { headers, rows, delimiter };
}

export function detectColumns(headers: string[], pinned: ColumnMap = {}): { map: ColumnMap; unmapped: string[] } {
  const normalised = headers.map(normHeader);
  const map: ColumnMap = {};
  const used = new Set<string>();

  for (const [field, header] of Object.entries(pinned) as Array<[Field, string]>) {
    if (header && headers.includes(header)) {
      map[field] = header;
      used.add(header);
    }
  }

  const claim = (field: Field, idx: number) => {
    map[field] = headers[idx];
    used.add(headers[idx]);
  };

  // Pass 1: a header that *is* a known name.
  for (const field of Object.keys(SYNONYMS) as Field[]) {
    if (map[field]) continue;
    for (const synonym of SYNONYMS[field]) {
      const idx = normalised.findIndex((h, i) => h === synonym && !used.has(headers[i]));
      if (idx !== -1) {
        claim(field, idx);
        break;
      }
    }
  }

  // Pass 2: a header that *contains* a known name as whole words, e.g.
  // "Your Price (Inc GST)" → cost. Only for fields still unmapped.
  for (const field of CONTAINS_ORDER) {
    if (map[field]) continue;
    for (const synonym of SYNONYMS[field]) {
      const idx = normalised.findIndex((h, i) => containsWords(h, synonym) && !used.has(headers[i]));
      if (idx !== -1) {
        claim(field, idx);
        break;
      }
    }
  }

  return { map, unmapped: headers.filter((h) => !used.has(h)) };
}

const money = (v: string | undefined): number | null => {
  if (v == null) return null;
  const cleaned = v.replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  if (cleaned === "" || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const gstFlag = (v: string | undefined): boolean => {
  if (v == null || v.trim() === "") return true;
  const s = v.trim().toLowerCase();
  if (["n", "no", "0", "false", "free", "gst free", "fre", "exempt", "nil"].includes(s)) return false;
  return true;
};

export type ParseReport = {
  items: ParsedItem[];
  columns: ColumnMap;
  unmappedHeaders: string[];
  rows: number;
  skipped: number;
  warnings: string[];
  /** True when the chosen price header says it includes GST, in which case cost was divided by 1.1. */
  priceIncludedGst: boolean;
};

export function parsePriceFile(text: string, pinned: ColumnMap = {}): ParseReport {
  const { headers, rows } = parseDelimited(text);
  const { map, unmapped } = detectColumns(headers, pinned);
  const warnings: string[] = [];

  if (!map.code) throw new Error(`No product-code column found. Headers: ${headers.join(", ")}`);
  if (!map.cost) throw new Error(`No price column found. Headers: ${headers.join(", ")}`);

  const costHeader = normHeader(map.cost);
  const priceIncludedGst = /inc(l(usive)?)? ?gst/.test(costHeader);
  if (priceIncludedGst) warnings.push(`"${map.cost}" looks GST-inclusive; stored cost is that figure ÷ 1.1.`);
  if (!map.description) warnings.push("No description column found — created materials would be named by code only.");
  if (!map.gst) warnings.push("No GST column found — every item is assumed taxable.");

  const col = (name: string | undefined) => (name ? headers.indexOf(name) : -1);
  const ci = {
    code: col(map.code),
    description: col(map.description),
    cost: col(map.cost),
    gst: col(map.gst),
    uom: col(map.uom),
    pack_qty: col(map.pack_qty),
    list_price: col(map.list_price),
    category: col(map.category),
    barcode: col(map.barcode),
  };
  const cell = (r: string[], i: number) => (i >= 0 ? r[i]?.trim() : undefined);

  const items: ParsedItem[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  for (const r of rows) {
    const code = cell(r, ci.code);
    if (!code) {
      skipped++;
      continue;
    }
    const key = code.toUpperCase();
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);

    let cost = money(cell(r, ci.cost));
    if (cost != null && priceIncludedGst) cost = Number((cost / 1.1).toFixed(4));

    const raw: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (r[i] != null && r[i] !== "") raw[h] = r[i];
    });

    items.push({
      code,
      description: cell(r, ci.description) || null,
      uom: cell(r, ci.uom) || null,
      pack_qty: money(cell(r, ci.pack_qty)),
      cost,
      gst_applies: gstFlag(cell(r, ci.gst)),
      list_price: money(cell(r, ci.list_price)),
      category: cell(r, ci.category) || null,
      barcode: cell(r, ci.barcode) || null,
      raw,
    });
  }

  const noCost = items.filter((i) => i.cost == null).length;
  if (noCost) warnings.push(`${noCost} row(s) have no readable price and will be stored without a cost.`);

  return { items, columns: map, unmappedHeaders: unmapped, rows: rows.length, skipped, warnings, priceIncludedGst };
}
