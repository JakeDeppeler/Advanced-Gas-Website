import { Card, Empty, Pill, Row } from "@/components/portal/kit/Kit";
import { KIND_SHORT, stage, tenantLine, type WorkOrderRow } from "@/lib/outlook/workOrderTypes";

/**
 * Every work order the mailboxes brought in, newest first, and where each is
 * up to: in ServiceTitan's Bookings, on its job, already booked, or not booked
 * yet and why. Pure: given rows, it renders, so it can be looked at with
 * made-up rows before any real ones arrive.
 */

const when = (iso: string | null) => {
  const t = Date.parse(iso ?? "");
  return Number.isFinite(t)
    ? new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(t)
    : "";
};

const HOW: Record<WorkOrderRow["source"], string> = { auto: "", forward: "forwarded", category: "marked in Outlook" };

export function WorkOrderList({ rows }: { rows: WorkOrderRow[] }) {
  if (!rows.length) {
    return <Empty>No work orders in the last 30 days. They appear here as they arrive in admin@ or jake@, or when one is forwarded or marked in Outlook.</Empty>;
  }
  return (
    <Card flush>
      {rows.map((r) => {
        const st = stage(r);
        const what = [r.kind ? KIND_SHORT[r.kind] : null, r.wo_number, r.agency ? `· ${r.agency}` : null].filter(Boolean).join(" ");
        const job = r.details?.job;
        const sub = [
          [when(r.received_at ?? r.created_at), `to ${r.mailbox.split("@")[0]}@`, HOW[r.source]].filter(Boolean).join(" · "),
          [what, job].filter(Boolean).join(": "),
          st.line,
          tenantLine(r),
          r.attach_error ? `Attaching to the job failed: ${r.attach_error}` : "",
        ].filter(Boolean);
        return (
          <Row
            key={r.id}
            title={r.address ?? r.subject ?? "No address read"}
            sub={sub.map((line, i) => (
              <span key={i} className="wo-line">{line}</span>
            ))}
            end={<Pill st={{ k: st.tone, w: st.word }} />}
          />
        );
      })}
    </Card>
  );
}
