"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { stSend, stTenantPath, serviceTitanConfigured } from "@/lib/dashboard/servicetitan";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { sbSelectOne, q } from "@/lib/dashboard/db";
import { createAutoTodo } from "@/lib/todos/store";
import { READY_LIST } from "@/lib/todos/types";
import { listLike, officePerson } from "@/lib/todos/officeTo";
import { loadTradeDone, onJob, saveTradeDone } from "@/lib/portal/tradeJobs";

export type JobResult = { ok: boolean; error?: string; said?: string };

const goodId = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n > 0;

/** The signed-in person, and only when they're on this job in ServiceTitan. */
async function mine(jobId: number) {
  const me = await getPortalUser();
  if (!me) return null;
  return (await onJob(me.name, jobId).catch(() => false)) ? me : null;
}

async function note(jobId: number, text: string) {
  await stSend("POST", stTenantPath("jpm", `jobs/${jobId}/notes`), { text: text.slice(0, 4000), pinToTop: false });
}

/** A note on the job in ServiceTitan, signed, for the office and the next tech to read. */
export async function addJobNote(jobId: number, text: string): Promise<JobResult> {
  if (!goodId(jobId)) return { ok: false, error: "That job couldn't be found." };
  const body = String(text ?? "").trim();
  if (!body) return { ok: false, error: "Write the note first." };
  if (!serviceTitanConfigured()) return { ok: false, error: "ServiceTitan isn't connected." };
  const me = await mine(jobId);
  if (!me) return { ok: false, error: "You're not on that job in ServiceTitan." };
  try {
    await note(jobId, `${body}\n— ${me.name}, from the trade portal`);
  } catch {
    return { ok: false, error: "ServiceTitan didn't take the note. Try again, or add it in the app." };
  }
  return { ok: true, said: "Note's on the job in ServiceTitan." };
}

/**
 * The tech says the work's done. Completing a job in ServiceTitan is left to
 * the office, who check it before it's invoiced, so this does the parts that
 * are safe to do from a phone: a note on the job, a card for the office to
 * complete and invoice it, and a mark that takes the job off this tech's
 * "left open" list and their close-the-job card.
 */
export async function markJobDone(jobId: number, text?: string): Promise<JobResult> {
  if (!goodId(jobId)) return { ok: false, error: "That job couldn't be found." };
  const me = await mine(jobId);
  if (!me) return { ok: false, error: "You're not on that job in ServiceTitan." };
  const done = await loadTradeDone();
  if (done[String(jobId)]) return { ok: true, said: "Already marked done. The office has it." };
  const extra = String(text ?? "").trim().slice(0, 1000);
  const job = await sbSelectOne<{ job_number: string | null; customer_name: string | null; suburb: string | null; job_type: string | null }>(
    "st_jobs", [q.select("job_number,customer_name,suburb,job_type"), q.eq("id", String(jobId))].join("&"),
  ).catch(() => null);
  const ref = job?.job_number ?? String(jobId);

  // Who it goes to first: with nobody to send it to, nothing else should happen
  // either, or a second press would put the note on the job twice.
  const to = await officePerson("accounts");
  if (!to) return { ok: false, error: "Nobody in the office to send it to. Tell the office." };
  let noted = false;
  if (serviceTitanConfigured()) {
    try { await note(jobId, `Work done${extra ? `: ${extra}` : "."}\n— ${me.name}, marked done from the trade portal`); noted = true; } catch { /* said below */ }
  }
  try {
    await createAutoTodo({
      title: `Complete and invoice job ${ref}${job?.customer_name ? `, ${job.customer_name}` : ""}, ${me.name.split(" ")[0]} says it's done`,
      notes: `${job?.job_type ?? "Job"}${job?.suburb ? ` in ${job.suburb}` : ""}. ${me.name} marked the work done from the trade portal${extra ? `: "${extra}"` : "."}\nComplete it in ServiceTitan, then invoice it.`,
      assigneeId: to.id,
      dueOn: isoDateMelbourne(new Date()),
      list: (await listLike(new RegExp(`^${READY_LIST}$`, "i"))) ?? (await listLike(/service\s*titan/i)),
    });
  } catch {
    return { ok: false, error: "Couldn't tell the office. Try again." };
  }
  done[String(jobId)] = { by: me.name, at: new Date().toISOString(), ...(extra ? { note: extra } : {}) };
  await saveTradeDone(done).catch(() => undefined);
  revalidatePath("/trade/jobs");
  return { ok: true, said: noted ? "Done. The office has it to complete and invoice." : "The office has it, but the note didn't go on the job in ServiceTitan." };
}
