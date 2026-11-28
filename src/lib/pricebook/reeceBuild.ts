import "server-only";
import { sbSelect } from "@/lib/dashboard/db";
import { stFetch, stSend, stTenantPath, stUpload } from "@/lib/dashboard/servicetitan";
import { getSettings, saveSettings } from "@/lib/portal/db";
import { logAuto, type AutoEntry } from "@/lib/automation/log";
import { reeceConfigured, reeceConnection, reeceSearch } from "./reece";
import { MARKUP_KEY, normaliseRules, ruleFor } from "./markupRules";
import {
  HEATERS, HEATER_CATEGORIES, REECE_VENDOR_ID, TAKEOFF_CATEGORIES, customerPrice, heaterPrice, pickTakeoffs, readHit, type ReeceHit,
} from "./reeceBuildSpecs";

/**
 * The Multisnap take-offs and the 4, 5 and 6 star heaters into the pricebook
 * from Reece's catalogue (reeceBuildSpecs.ts says what and why), as many as fit
 * a call after each sync.
 *
 * A fitting the pricebook already sells (found by its Reece code on any of its
 * vendors) has its cost and price brought to Reece's and a photo added if it
 * has none; one it doesn't is made. A heater is made once and left to the
 * equipment price runs after that. Each item made is recorded the moment it
 * exists, so a run cut off part way never makes it twice. Three refusals stop
 * the kind that was refused, for a person to look at; three failed photos stop
 * the photos, the prices still go on.
 */
const KEY = "reece_build";
type Raw = Record<string, unknown>;
type Progress = { made?: Record<string, number>; priced?: Record<string, string>; images?: Record<string, string>; notes?: Record<string, string>; fails?: number; imageFails?: number };

const near = (a: unknown, b: number | null) => b == null || Math.abs(Number(a) - b) < 0.01;
const vendorParts = (raw: Raw) => [raw.primaryVendor, ...(Array.isArray(raw.otherVendors) ? raw.otherVendors : [])]
  .map((v) => String((v as Raw | null)?.vendorPart ?? "").trim()).filter(Boolean);

/** Reece's photo into the pricebook item: uploaded to ServiceTitan, then named in the item's assets. */
async function attachImage(kind: "materials" | "equipment", id: number, url: string, label: string): Promise<string> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Reece's photo didn't download (${res.status})`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const mime = res.headers.get("content-type") ?? "image/jpeg";
  const up = await stUpload<unknown>(stTenantPath("pricebook", "images"), `${label.replace(/[^\w.-]+/g, "-").slice(0, 60)}.jpg`, bytes, mime);
  const o = (up ?? {}) as Raw;
  const path = typeof up === "string" ? up : String(o.path ?? o.url ?? (Array.isArray(o.data) ? o.data[0] : "") ?? "");
  if (!path) throw new Error("ServiceTitan took the photo without saying where");
  const ep = stTenantPath("pricebook", `${kind}/${id}`);
  const item = await stFetch<Raw>(ep);
  const assets = Array.isArray(item.assets) ? (item.assets as Raw[]) : [];
  await stSend("PATCH", ep, { assets: [...assets, { alias: null, fileName: path.split("/").pop(), isDefault: assets.length === 0, type: "Image", url: path }] });
  const back = await stFetch<Raw>(ep);
  if (!Array.isArray(back.assets) || back.assets.length <= assets.length) throw new Error("ServiceTitan answered OK but kept no photo");
  return path;
}

async function searchAll(phrase: string, pages = 2): Promise<ReeceHit[]> {
  const out: ReeceHit[] = [];
  for (let page = 1; page <= pages; page++) {
    const r = await reeceSearch(phrase, 100, page);
    out.push(...r.items.map((i) => readHit(i as Parameters<typeof readHit>[0])));
    if (r.items.length < 100) break;
  }
  return out;
}

export async function buildFromReece(until: number): Promise<{ made: string[]; priced: string[]; photos: number; failed: string[]; left: number; skipped?: string }> {
  const out = { made: [] as string[], priced: [] as string[], photos: 0, failed: [] as string[], left: 0 };
  if (!reeceConfigured() || (await reeceConnection()).status !== "ready") return { ...out, skipped: "Reece isn't connected" };
  const p: Progress = (await getSettings<Progress>(KEY).catch(() => null)) ?? {};
  const made = (p.made ??= {}), priced = (p.priced ??= {}), images = (p.images ??= {}), notes = (p.notes ??= {});
  if ((p.fails ?? 0) >= 3) return { ...out, skipped: "stopped after three refusals: see the notes" };
  const log: AutoEntry[] = [];
  const save = () => saveSettings(KEY, p);
  const today = new Date().toISOString().slice(0, 10);
  const photosOn = () => (p.imageFails ?? 0) < 3;
  const photo = async (kind: "materials" | "equipment", id: number, code: string, url: string | null, label: string) => {
    if (!url || images[code] || !photosOn() || Date.now() > until) return;
    try { images[code] = await attachImage(kind, id, url, label); out.photos++; delete notes[`photo:${code}`]; }
    catch (e) { p.imageFails = (p.imageFails ?? 0) + 1; notes[`photo:${code}`] = (e as Error).message.slice(0, 200); }
  };

  // --- 1. The Multisnap take-offs ---------------------------------------------------------
  const hits = [...await searchAll("multisnap branch take off"), ...await searchAll("multisnap double branch", 1)];
  const mats = await sbSelect<{ id: number; name: string; raw: Raw | null }>("st_pricebook_materials", "select=id,name,raw&active=is.true&limit=3000");
  const byPart = new Map<string, { id: number; name: string; raw: Raw }>();
  for (const m of mats) for (const part of vendorParts(m.raw ?? {})) byPart.set(part, { id: Number(m.id), name: m.name, raw: m.raw ?? {} });
  const picks = pickTakeoffs(hits, new Set(byPart.keys()));
  for (const { name, hit } of picks) {
    if (Date.now() > until) { out.left++; continue; }
    const cost = hit.cost!, price = customerPrice(hit)!;
    const have = byPart.get(hit.code);
    const id = have?.id ?? made[hit.code];
    try {
      if (!id) {
        const body = {
          code: name.replace(/^Multisnap /, ""), displayName: name, description: `${hit.title}. Reece ${hit.code}.`,
          cost, price, memberPrice: 0, addOnPrice: 0, addOnMemberPrice: 0, hours: 0, active: true, isInventory: false,
          account: "Sales", taxable: true, categories: TAKEOFF_CATEGORIES,
          primaryVendor: { vendorId: REECE_VENDOR_ID, vendorPart: hit.code, cost, active: true },
        };
        const created = await stSend<{ id?: number } | null>("POST", stTenantPath("pricebook", "materials"), body);
        if (!created?.id) throw new Error("ServiceTitan answered without the new item's id");
        made[hit.code] = created.id;
        out.made.push(name);
        await save();
        await photo("materials", created.id, hit.code, hit.image, name);
      } else if (priced[hit.code] !== today) {
        const raw = have?.raw ?? {};
        // Fifty cents either way is the CMP already, rounded: not worth a write a night.
        if (Math.abs(Number(raw.price) - price) >= 0.5 || !near(raw.cost, cost)) {
          const pv = raw.primaryVendor as Raw | null;
          const ep = stTenantPath("pricebook", `materials/${id}`);
          await stSend("PATCH", ep, {
            cost, price,
            ...(pv && String(pv.vendorPart ?? "").trim() === hit.code ? { primaryVendor: { vendorId: pv.vendorId, vendorPart: hit.code, cost, active: true } } : {}),
          });
          const back = await stFetch<Raw>(ep);
          if (!near(back.price, price)) throw new Error(`ServiceTitan answered OK but kept $${String(back.price)}`);
          out.priced.push(`${have?.name ?? name}: $${String(raw.price)} → $${price} (cost $${cost})`);
        }
        priced[hit.code] = today;
        if (!Array.isArray(raw.assets) || !raw.assets.length) await photo("materials", id, hit.code, hit.image, name);
      }
    } catch (e) {
      p.fails = (p.fails ?? 0) + 1;
      notes[hit.code] = (e as Error).message.slice(0, 300);
      out.failed.push(name);
      log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: false, title: `${name} couldn't be brought in from Reece`, detail: notes[hit.code] });
      if ((p.fails ?? 0) >= 3) break;
    }
    await save();
  }

  // --- 2. The heaters ---------------------------------------------------------------------
  const rules = normaliseRules(await getSettings<unknown>(MARKUP_KEY).catch(() => null));
  const eq = await sbSelect<{ id: number; raw: Raw | null }>("st_pricebook_equipment", "select=id,raw&active=is.true&limit=2000");
  const eqByPart = new Map<string, number>();
  for (const e of eq) for (const part of vendorParts(e.raw ?? {})) eqByPart.set(part, Number(e.id));
  for (const h of HEATERS) {
    if (made[h.code] || eqByPart.has(h.code)) { made[h.code] ??= eqByPart.get(h.code)!; continue; }
    if (Date.now() > until || (p.fails ?? 0) >= 3) { out.left++; continue; }
    try {
      const hit = (await searchAll(h.code, 1)).find((x) => x.code === h.code);
      if (!hit || hit.cost == null) throw new Error(`Reece has no price for ${h.code}`);
      const markup = ruleFor(rules, h.brand, "Gas ducted heater").markup ?? rules.fallback;
      const price = heaterPrice(hit.cost, markup, rules.roundTo);
      const created = await stSend<{ id?: number } | null>("POST", stTenantPath("pricebook", "equipment"), {
        code: h.model, displayName: h.name, description: `${hit.title}. Reece ${h.code}.`,
        price, memberPrice: 0, addOnPrice: 0, addOnMemberPrice: 0, cost: hit.cost,
        manufacturer: h.manufacturer, model: h.model, active: true, account: "Sales", taxable: true, isInventory: false, hours: 0,
        categories: HEATER_CATEGORIES,
        primaryVendor: { vendorId: REECE_VENDOR_ID, vendorPart: h.code, cost: hit.cost, active: true },
      });
      if (!created?.id) throw new Error("ServiceTitan answered without the new item's id");
      made[h.code] = created.id;
      out.made.push(`${h.name} at $${price} (cost $${hit.cost}, ${markup}%)`);
      await save();
      await photo("equipment", created.id, h.code, hit.image, h.name);
    } catch (e) {
      p.fails = (p.fails ?? 0) + 1;
      notes[h.code] = (e as Error).message.slice(0, 300);
      out.failed.push(h.name);
      log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: false, title: `${h.name} couldn't be added from Reece`, detail: notes[h.code] });
    }
    await save();
  }

  if (out.made.length || out.priced.length) {
    log.push({ at: new Date().toISOString(), kind: "quoteTemplates", ok: true, title: `Reece into the pricebook: ${out.made.length} added, ${out.priced.length} repriced`, detail: [...out.made, ...out.priced].join("; ").slice(0, 600) });
  }
  await save();
  await logAuto(log).catch(() => undefined);
  return out;
}

/** The pricebook id of each heater made or found, by its Reece code, for the templates. */
export async function reeceHeaterIds(): Promise<Record<string, number>> {
  return ((await getSettings<Progress>(KEY).catch(() => null))?.made) ?? {};
}
