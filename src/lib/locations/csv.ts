// Turns an uploaded CSV into a location list, in the browser, so the preview is
// instant and nothing is sent until the office has looked at it.
//
// CSV rather than .xlsx: reading Excel needs a zip and XML library, and "Save
// As → CSV" is one step in Excel. What CSV loses is cell colour, which is how
// the village marked serviced units — so status is a column here instead.
//
// Pure: no React, no server imports.

import type { ImportLocation, StatusTag } from "./stLocations";

/** RFC 4180-ish: quoted fields, doubled quotes, commas and newlines inside quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

export const FIELDS = [
  { key: "name", label: "Location name", hint: "Leave unset to build it from the unit number" },
  { key: "unit", label: "Unit number" },
  { key: "street", label: "Street" },
  { key: "city", label: "Suburb" },
  { key: "state", label: "State" },
  { key: "zip", label: "Postcode" },
  { key: "contactName", label: "Contact name / role" },
  { key: "email", label: "Contact email" },
  { key: "phone", label: "Contact phone" },
  { key: "notes", label: "Notes", hint: "Pinned to the location — repairs, access" },
  { key: "status", label: "Service status", hint: "e.g. serviced / due / vacant" },
  { key: "tags", label: "Other tags", hint: "Tag names, separated by ; or ," },
] as const;

export type FieldKey = (typeof FIELDS)[number]["key"];
export type ColumnMap = Partial<Record<FieldKey, number>>;

/** Header words that point at each field, so a sensible sheet maps itself. */
const GUESS: Record<FieldKey, RegExp> = {
  name: /^(location|site|name|location name|site name)$/i,
  unit: /^(unit|unit no\.?|unit number|villa|apt|apartment|no\.?|number|#)$/i,
  street: /^(street|address|street address|address 1|address line 1)$/i,
  city: /^(suburb|city|town|locality)$/i,
  state: /^(state)$/i,
  zip: /^(postcode|post code|zip|postal code)$/i,
  contactName: /^(contact|contact name|role|contact role)$/i,
  email: /^(e-?mail|contact email)$/i,
  phone: /^(phone|mobile|contact phone|phone number)$/i,
  notes: /^(notes?|repairs?|comments?|issues?)$/i,
  status: /^(status|service status|serviced\??|service)$/i,
  tags: /^(tags?)$/i,
};

export function guessColumns(header: string[]): ColumnMap {
  const map: ColumnMap = {};
  header.forEach((h, i) => {
    const t = h.trim();
    for (const k of Object.keys(GUESS) as FieldKey[]) {
      if (map[k] == null && GUESS[k].test(t)) { map[k] = i; break; }
    }
  });
  return map;
}

export type Defaults = {
  street: string;
  city: string;
  state: string;
  zip: string;
  contactName: string;
  email: string;
  phone: string;
  /** "Unit" → "Unit 001". */
  namePrefix: string;
  /** Pad unit numbers to the widest one, so "Unit 7" sorts beside "Unit 70" as "Unit 007". */
  pad: boolean;
};

export const EMPTY_DEFAULTS: Defaults = {
  street: "", city: "", state: "VIC", zip: "", contactName: "", email: "", phone: "", namePrefix: "Unit", pad: true,
};

/** Every distinct status value in the sheet, in first-seen order. */
export function statusValues(rows: string[][], map: ColumnMap): string[] {
  if (map.status == null) return [];
  const seen = new Map<string, string>();
  for (const r of rows) {
    const v = (r[map.status] ?? "").trim();
    if (v && !seen.has(v.toLowerCase())) seen.set(v.toLowerCase(), v);
  }
  return [...seen.values()];
}

const splitTags = (s: string) => s.split(/[;,]/).map((t) => t.trim()).filter(Boolean);

/**
 * Builds the list. `statusTag` maps each status value (lower-cased) to a tag
 * name, or "" for none. Rows with no name and no unit are skipped and counted.
 */
export function buildLocations(
  rows: string[][],
  map: ColumnMap,
  d: Defaults,
  statusTag: Record<string, string>,
): { locations: ImportLocation[]; skipped: number; statusTags: StatusTag[] } {
  const cell = (r: string[], k: FieldKey) => (map[k] != null ? (r[map[k] as number] ?? "").trim() : "");
  const units = rows.map((r) => cell(r, "unit"));
  const width = d.pad ? Math.max(0, ...units.filter((u) => /^\d+$/.test(u)).map((u) => String(Number(u)).length)) : 0;
  const unitText = (u: string) => (/^\d+$/.test(u) && width ? String(Number(u)).padStart(width, "0") : u);

  const locations: ImportLocation[] = [];
  let skipped = 0;
  for (const r of rows) {
    const unit = unitText(cell(r, "unit"));
    const name = cell(r, "name") || (unit ? `${d.namePrefix ? `${d.namePrefix} ` : ""}${unit}` : "");
    if (!name) { skipped++; continue; }

    const email = cell(r, "email") || d.email;
    const phone = cell(r, "phone") || d.phone;
    const memo = cell(r, "contactName") || d.contactName || undefined;
    const contacts: ImportLocation["contacts"] = [];
    if (email) contacts.push({ type: "Email", value: email, ...(memo ? { memo } : {}) });
    if (phone) contacts.push({ type: /^(\+?61|0)4/.test(phone.replace(/\s/g, "")) ? "MobilePhone" : "Phone", value: phone, ...(memo ? { memo } : {}) });

    const status = cell(r, "status").toLowerCase();
    const tags = [...new Set([...(statusTag[status] ? [statusTag[status]] : []), ...splitTags(cell(r, "tags"))])];
    const notes = cell(r, "notes");

    locations.push({
      name,
      address: {
        street: cell(r, "street") || d.street,
        ...(unit ? { unit } : {}),
        city: cell(r, "city") || d.city,
        state: cell(r, "state") || d.state,
        zip: cell(r, "zip") || d.zip,
        country: "Australia",
      },
      ...(contacts.length ? { contacts } : {}),
      ...(notes ? { notes: [notes] } : {}),
      ...(tags.length ? { tags } : {}),
    });
  }

  // The statuses the "mark serviced" buttons offer: one per distinct tag the
  // status column maps to, labelled with the status as the sheet wrote it.
  const statusTags: StatusTag[] = [];
  for (const [value, tag] of Object.entries(statusTag)) {
    if (tag && !statusTags.some((s) => s.tag === tag)) statusTags.push({ label: value.charAt(0).toUpperCase() + value.slice(1), tag });
  }
  return { locations, skipped, statusTags };
}
