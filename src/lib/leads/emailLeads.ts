import "server-only";
import { q, sbInsert, sbSelect } from "@/lib/dashboard/db";
import { createAutoTodo, todayMelbourne, teamPeople, officeIds } from "@/lib/todos/store";
import { loadSwitches, logAuto } from "@/lib/automation/log";
import type { NewLead } from "@/lib/outlook/outlookTypes";

/**
 * An enquiry that came in by email, made into a lead like the website's (Jake,
 * 8 Nov: "all of the emails that come in that are a lead … auto uploaded to
 * ServiceTitan with all of the information, then on the person's to-do to
 * quote").
 *
 * The draft that reads every email already decides whether it's a new
 * enquiry and pulls out who and what. Here it becomes a portal_leads row, so
 * "Website enquiries into ServiceTitan's Bookings" sends it in on its next run
 * with everything in it, the same path as the quote form; and a to-do to
 * quote goes to the person set on Settings › Automatic.
 *
 * Keyed on the email's internet message id: the webhook and the sweep can
 * both reach the same email, and a retried draft must not make a second lead.
 */
export async function leadFromEmail(input: {
  messageKey: string; mailbox: string; subject: string; from: string; receivedAt: string | null; lead: NewLead; words: string;
}): Promise<{ made: boolean; leadId?: string; todo?: string }> {
  const sw = await loadSwitches();
  if (!sw.emailLeads) return { made: false };
  const key = `email:${input.messageKey}`.slice(0, 300);
  const [had] = await sbSelect<{ id: string }>("portal_leads", [q.select("id"), q.eq("external_id", key), "limit=1"].join("&"));
  if (had) return { made: false, leadId: had.id };

  const l = input.lead;
  const email = l.email || input.from;
  const where = [l.address, l.suburb].filter(Boolean).join(", ");
  await sbInsert("portal_leads", {
    kind: "quote",
    source: "Email",
    external_id: key,
    created_at: input.receivedAt ?? new Date().toISOString(),
    name: l.name || null,
    phone: l.phone || null,
    email: email || null,
    address: l.address || null,
    suburb: l.suburb || null,
    postcode: l.postcode || null,
    service: l.service || null,
    headline: l.service || null,
    summary: l.summary || null,
    // Their own words, for whoever quotes: the booking carries them into ServiceTitan.
    notes: `Emailed to ${input.mailbox}${input.subject ? `, "${input.subject}"` : ""}:\n\n${input.words.slice(0, 2500)}`,
    details: { via: "email", mailbox: input.mailbox, subject: input.subject, from: input.from },
  });
  const [row] = await sbSelect<{ id: string }>("portal_leads", [q.select("id"), q.eq("external_id", key), "limit=1"].join("&"));

  // To the person set for it; failing that, whoever gets the office's to-dos.
  const people = await teamPeople();
  const office = await officeIds();
  const to = (sw.quoteTo && people.some((p) => p.id === sw.quoteTo) ? sw.quoteTo : null)
    ?? (sw.officeTo && people.some((p) => p.id === sw.officeTo) ? sw.officeTo : null)
    ?? people.find((p) => office.includes(p.id))?.id ?? null;
  const who = l.name || email || "An email enquiry";
  let todo: string | undefined;
  if (to) {
    await createAutoTodo({
      title: `Quote: ${who}${l.service ? `, ${l.service.replace(/^quote:\s*/i, "")}` : ""}${l.suburb && !(l.service ?? "").toLowerCase().includes(l.suburb.toLowerCase()) ? ` (${l.suburb})` : ""}`,
      notes: [
        [l.phone, email].filter(Boolean).join(" · "),
        where,
        l.summary,
        `From an email to ${input.mailbox}${input.subject ? `: "${input.subject}"` : ""}. On Website › Leads, and into ServiceTitan's Bookings with the website's enquiries.`,
      ].filter(Boolean).join("\n\n"),
      assigneeId: to,
      dueOn: todayMelbourne(),
    });
    todo = people.find((p) => p.id === to)?.name;
  }
  await logAuto([{
    at: new Date().toISOString(), kind: "emailLeads", ok: true,
    title: `${who}: email enquiry made a lead${todo ? `, to-do to quote for ${todo}` : ""}`,
  }]).catch(() => undefined);
  return { made: true, leadId: row?.id, todo };
}
