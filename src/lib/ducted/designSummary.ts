/**
 * What the Trust Trade designer says about a design when it's quoted from
 * the portal (Duct design): the unit, the outlets, and each zone with its
 * rooms, for the quote's summary. Pure.
 */

export type DesignerSummary = {
  unit: string | null;
  kw: number | null;
  outlets: number;
  zones: { number: number; name: string; rooms: string[] }[];
  storeys: number;
  fanLps: number | null;
};

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** The summary's own sentence on the zones, then the office's notes. */
export function designNotes(s: DesignerSummary | null | undefined, notes: string): string {
  const zones = (s?.zones ?? []).filter((z) => z && typeof z.name === "string").slice(0, 12);
  const said = zones.map((z) => {
    const rooms = (Array.isArray(z.rooms) ? z.rooms : []).map((r) => String(r).trim()).filter(Boolean).slice(0, 12);
    const others = rooms.filter((r) => r.toLowerCase() !== z.name.trim().toLowerCase());
    return others.length && !(rooms.length === 1) ? `${z.name.trim()} (${list(rooms)})` : z.name.trim();
  });
  return [said.length ? `The zones: ${said.join("; ")}.` : "", notes.trim()].filter(Boolean).join("\n\n");
}

/** A summary as it comes from the designer's frame, kept only as far as it makes sense. */
export function cleanSummary(x: unknown): DesignerSummary | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const num = (v: unknown, max: number) => (Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= max ? Number(v) : null);
  return {
    unit: typeof o.unit === "string" ? o.unit.slice(0, 200) : null,
    kw: num(o.kw, 60),
    outlets: num(o.outlets, 100) ?? 0,
    zones: (Array.isArray(o.zones) ? o.zones : []).slice(0, 12).map((z: Record<string, unknown>) => ({
      number: num(z?.number, 20) ?? 0, name: String(z?.name ?? "").slice(0, 80),
      rooms: (Array.isArray(z?.rooms) ? z.rooms : []).slice(0, 20).map((r) => String(r).slice(0, 60)),
    })),
    storeys: num(o.storeys, 3) ?? 1,
    fanLps: num(o.fanLps, 5000),
  };
}
