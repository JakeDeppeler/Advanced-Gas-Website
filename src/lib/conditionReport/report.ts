// A ServiceTitan Condition Report (the "Condition Report" form the techs fill
// in on a visit), read into what its PDF shows. Pure, so it can be checked
// against a fixture.
//
// The shape is the one the forms probe found on 31 Oct (submission 465, job
// 20721): a flat list of units, each a name, a type and a value. Text, Date,
// Dropdown, a Stoplight and a Signature (a PNG data URL). The photos hang off
// the unit they were taken against, and are also among the job's files, so
// they already go with a work order as photos; the PDF only counts them.

export type Unit = {
  name?: string | null;
  type?: string | null;
  value?: unknown;
  comment?: string | null;
  attachments?: { fileName?: string | null; originalFileName?: string | null }[] | null;
  options?: unknown;
  isRefused?: boolean | null;
  refusalReason?: string | null;
};

export type Submission = {
  id: number;
  formName?: string | null;
  status?: string | null;
  submittedOn?: string | null;
  owners?: { type?: string | null; id?: number | null }[] | null;
  units?: Unit[] | null;
};

/**
 * The Stoplight's answer. ServiceTitan sends a number: 1 was amber on job
 * 20721 and 0 was red on job 20718 (Jake, reading both reports, 1 Nov), so 2
 * is green. Anything else isn't guessed at.
 */
export type Light = 0 | 1 | 2;
export const LIGHT_WORD: Record<Light, string> = { 0: "Red", 1: "Amber", 2: "Green" };

export type Report = {
  id: number;
  title: string;
  jobNumber: string | null;
  customer: string | null;
  site: string | null;
  /** Equipment make and model, for the heading and the file name. */
  equipment: string | null;
  submittedOn: string | null;
  lights: { name: string; light: Light | null; comment: string | null }[];
  facts: [string, string][];
  notes: { name: string; text: string; photos: number }[];
  photos: number;
  signature: { png: string | null; refused: string | null; by: string | null } | null;
};

const TZ = "Australia/Melbourne";
const clean = (s: unknown) => (typeof s === "string" ? s.replace(/\r\n?/g, "\n").trim() : "");
const label = (u: Unit) => clean(u.name) || "Untitled";

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-AU", { timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/** A unit's answer as words, or "" when it wasn't answered. */
export function answer(u: Unit): string {
  const v = u.value;
  if (v == null || v === "") return "";
  const type = (u.type ?? "").toLowerCase();
  if (type === "date" && typeof v === "string") return when(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.map((x) => answer({ ...u, value: x })).filter(Boolean).join(", ");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return clean(o.name ?? o.text ?? o.label ?? o.value);
  }
  // A dropdown may answer with its option's position: name it when the options say.
  if (type === "dropdown" && typeof v === "number" && Array.isArray(u.options)) {
    const opt = (u.options as unknown[])[v];
    if (typeof opt === "string") return opt;
    if (opt && typeof opt === "object") return clean((opt as Record<string, unknown>).name ?? (opt as Record<string, unknown>).text ?? (opt as Record<string, unknown>).value) || String(v);
  }
  return clean(String(v));
}

const isNote = (u: Unit, text: string) => /note|comment|finding|recommend|description|observ/i.test(label(u)) || text.length > 70 || text.includes("\n");

export function toReport(s: Submission): Report {
  const units = s.units ?? [];
  const named = (re: RegExp) => units.find((u) => re.test(label(u)));
  const used = new Set<Unit>();
  const take = (re: RegExp) => { const u = named(re); if (u) used.add(u); return u ? answer(u) || null : null; };

  const jobNumber = take(/^job (number|no\.?|#)$/i);
  const customer = take(/^customer( name)?$/i);
  const site = take(/address|^location$|^site$/i);
  const make = answer(named(/manufacturer|make|brand/i) ?? {});
  const model = answer(named(/model/i) ?? {});
  const equipment = [make, model].filter(Boolean).join(" ") || answer(named(/^equipment( name)?$/i) ?? {}) || null;

  const lights: Report["lights"] = [];
  const facts: [string, string][] = [];
  const notes: Report["notes"] = [];
  let signature: Report["signature"] = null;
  let photos = 0;
  // "Technician", not "Technician Notes", which comes first on the form.
  const by = answer(named(/^(technician|tech|completed by|inspected by|technician name)$/i) ?? {}) || null;

  for (const u of units) {
    const n = u.attachments?.length ?? 0;
    photos += n;
    if (used.has(u)) continue;
    const type = (u.type ?? "").toLowerCase();
    const comment = clean(u.comment) || null;
    if (type === "stoplight") {
      const v = typeof u.value === "number" ? u.value : typeof u.value === "string" && /^\d$/.test(u.value) ? Number(u.value) : null;
      lights.push({ name: label(u), light: v === 0 || v === 1 || v === 2 ? v : null, comment });
      continue;
    }
    if (type === "signature") {
      const png = typeof u.value === "string" && /^data:image\/png;base64,/.test(u.value) ? u.value.slice("data:image/png;base64,".length) : null;
      signature = { png, refused: u.isRefused ? clean(u.refusalReason) || "Refused" : null, by };
      continue;
    }
    const text = answer(u);
    if (!text && !comment) {
      if (n) notes.push({ name: label(u), text: "", photos: n });
      continue;
    }
    if (isNote(u, text) || n) {
      notes.push({ name: label(u), text: [text, comment].filter(Boolean).join("\n\n"), photos: n });
      continue;
    }
    facts.push([label(u), comment ? `${text} (${comment})` : text]);
  }

  return {
    id: s.id,
    title: clean(s.formName) || "Condition Report",
    jobNumber, customer, site, equipment,
    submittedOn: s.submittedOn ?? null,
    lights, facts, notes, photos, signature,
  };
}

/** Plain ASCII, as the email's attachment name: "Condition report - job 20721 - Daikin RZQ71FV4A.pdf". */
export function reportFileName(r: Report): string {
  const bits = ["Condition report", r.jobNumber ? `job ${r.jobNumber}` : null, r.equipment].filter(Boolean).join(" - ");
  return `${bits.replace(/[^A-Za-z0-9 ._()-]+/g, "").replace(/\s+/g, " ").trim().slice(0, 120)}.pdf`;
}
