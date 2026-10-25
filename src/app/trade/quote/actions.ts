"use server";

import { getPortalUser } from "@/lib/portal/session";
import { isoDateMelbourne } from "@/lib/dashboard/dates";
import { createAutoTodo } from "@/lib/todos/store";
import { listLike, officePerson } from "@/lib/todos/officeTo";
import type { Quote } from "@/components/portal/quoteStore";

const money = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-AU")}`;
const clean = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/**
 * The quote built on the iPad, sent to the office to write up in ServiceTitan.
 * It was kept only on the device, so a quote built in a kitchen and not typed
 * into ServiceTitan that night was lost with the browser tab. A card on the
 * Quoting list carries every option and extra, so the office has it all.
 */
export async function sendQuoteToOffice(input: Quote): Promise<{ ok: boolean; error?: string; said?: string }> {
  const me = await getPortalUser();
  if (!me) return { ok: false, error: "Sign in again." };
  const options = Array.isArray(input?.options) ? input.options.slice(0, 3) : [];
  const extras = Array.isArray(input?.extras) ? input.extras.slice(0, 12) : [];
  if (!options.length) return { ok: false, error: "Add an option first." };
  const customer = clean(input.customer, 120);
  const extraSum = extras.reduce((s, e) => s + (Number.isFinite(Number(e.amount)) ? Number(e.amount) : 0), 0);
  const lines = options.map((o, i) => {
    const price = o.price == null || !Number.isFinite(Number(o.price)) ? null : Number(o.price);
    return `Option ${i + 1}: ${clean(o.brand, 60)} ${clean(o.name, 120)} · ${price == null ? "priced on site" : `${money(price + extraSum)} inc GST, installed`}`;
  });
  const notes = [
    `Built by ${me.name} in the trade portal${customer ? ` for ${customer}` : ""}.`,
    ...lines,
    extras.length ? `On every option: ${extras.map((e) => `${clean(e.label, 80)} ${money(Number(e.amount) || 0)}`).join("; ")}.` : null,
    "Write it up in ServiceTitan and send it to the customer.",
  ].filter(Boolean).join("\n");
  const to = await officePerson("office");
  if (!to) return { ok: false, error: "Nobody in the office to send it to. Tell the office." };
  try {
    await createAutoTodo({
      title: `Write up ${me.name.split(" ")[0]}'s quote${customer ? ` for ${customer}` : ""}, ${options.length} ${options.length === 1 ? "option" : "options"}`,
      notes,
      assigneeId: to.id,
      dueOn: isoDateMelbourne(new Date()),
      list: await listLike(/quot|sales/i),
    });
  } catch {
    return { ok: false, error: "Couldn't send it. Try again." };
  }
  return { ok: true, said: `Sent. ${to.name.split(" ")[0]} has it on the Quoting list.` };
}
