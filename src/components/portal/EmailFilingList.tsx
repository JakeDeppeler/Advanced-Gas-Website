import { Card, Empty, Pill, Row, type Status } from "@/components/portal/kit/Kit";
import type { FilingListRow } from "@/lib/outlook/filing";

/**
 * Where each of the fortnight's Inbox emails went, or would go, or why it
 * stays. Pure: given rows, it renders, so it can be looked at with made-up
 * rows before the trial has run.
 */

const when = (iso: string | null) => {
  const t = Date.parse(iso ?? "");
  return Number.isFinite(t)
    ? new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(t)
    : "";
};

const PILL: Record<FilingListRow["status"], Status> = {
  would: { k: "ahead", w: "Would file" },
  moved: { k: "good", w: "Filed" },
  kept: { k: "mid", w: "Flagged word" },
  back: { k: "none", w: "Put back" },
  stays: { k: "none", w: "Stays" },
  failed: { k: "bad", w: "Didn't move" },
};

function Line({ r }: { r: FilingListRow }) {
  const where =
    r.status === "would" ? `Would go to ${r.folder_name}: ${r.why}` :
    r.status === "moved" ? `Filed in ${r.folder_name}: ${r.why}` :
    r.status === "failed" ? `Couldn't move it to ${r.folder_name}${r.error ? ` (${r.error})` : ""}` :
    `Stays in the Inbox: ${r.why ?? ""}`;
  return (
    <Row
      title={r.subject || "(no subject)"}
      sub={[[r.from_address, when(r.received_at)].filter(Boolean).join(" · "), where].map((line, i) => (
        <span key={i} className="ef-line">{line}</span>
      ))}
      end={<Pill st={PILL[r.status]} />}
    />
  );
}

export function EmailFilingList({ rows, mode }: { rows: FilingListRow[]; mode: "off" | "trial" | "on" }) {
  if (!rows.length) {
    return (
      <Empty>
        {mode === "off"
          ? "Switched off, so nothing has been looked at. Choose Trial above to see where each email would go."
          : "Nothing looked at yet. The first run is within ten minutes of switching on; it reads the folders, then the last fortnight of the Inbox."}
      </Empty>
    );
  }
  const filed = rows.filter((r) => r.status === "would" || r.status === "moved" || r.status === "failed");
  const kept = rows.filter((r) => r.status === "kept");
  const stays = rows.filter((r) => r.status === "stays" || r.status === "back");

  const byFolder = new Map<string, number>();
  for (const r of filed) if (r.folder_name) byFolder.set(r.folder_name, (byFolder.get(r.folder_name) ?? 0) + 1);
  const folders = [...byFolder.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <>
      {folders.length > 0 && (
        <Card title={mode === "on" ? "Filed, by folder" : "Would be filed, by folder"}>
          <ul className="ef-folders">
            {folders.map(([name, n]) => (
              <li key={name}>
                <span>{name}</span>
                <b>{n}</b>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <h2 className="ef-h">
        {mode === "on" ? "Filed" : "Would be filed"} <b>{filed.length}</b>
      </h2>
      <Card flush>{filed.length ? filed.map((r) => <Line key={r.message_id} r={r} />) : <Empty>None in the last fortnight.</Empty>}</Card>

      {kept.length > 0 && (
        <>
          <h2 className="ef-h">
            Kept in the Inbox by a flagged word <b>{kept.length}</b>
          </h2>
          <Card flush>{kept.map((r) => <Line key={r.message_id} r={r} />)}</Card>
        </>
      )}

      <details className="ef-more">
        <summary>
          Stays in the Inbox <b>{stays.length}</b>
          <span>Needs a person, waiting on a reply, flagged, or no folder for that sender yet</span>
        </summary>
        <Card flush>{stays.length ? stays.map((r) => <Line key={r.message_id} r={r} />) : <Empty>None.</Empty>}</Card>
      </details>
    </>
  );
}
