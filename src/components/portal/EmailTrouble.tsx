"use client";

import { useState, useTransition } from "react";
import { sorted } from "@/app/portal/email/actions";
import { Empty, Group, Row } from "@/components/portal/kit/Kit";
import { kindLabel } from "@/lib/email/eventTypes";
import type { TroubleRow } from "@/lib/email/read";

/**
 * Email that never arrived, and the one button that takes it off the wall.
 *
 * The button says "Sorted" rather than "Resend" because it cannot resend
 * anything — what it means is that a person has looked at this and dealt with
 * it however it needed dealing with, usually by picking up the phone. Naming
 * it for what it does rather than what somebody might wish it did is the
 * difference between a button people trust and one they press twice.
 */
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function EmailTrouble({ rows }: { rows: TroubleRow[] }) {
  const [pending, start] = useTransition();
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);

  const left = rows.filter((r) => !gone.has(r.id));
  if (!left.length) {
    return <Empty>Nothing is sitting undelivered. Every email this business has sent has gone out.</Empty>;
  }

  const press = (id: string) =>
    start(async () => {
      const res = await sorted(id);
      if (res.ok) setGone((g) => new Set([...g, id]));
      else setMsg(res.error ?? "That didn't save.");
    });

  return (
    <>
      {msg && <p className="pt-note pt-note--warn">{msg}</p>}
      <Group>
        {left.map((r) => (
          <Row
            key={r.id}
            title={
              <>
                {kindLabel(r.kind)}
                {/* Bounced and failed are different problems: one was refused
                    on the way out and is usually ours to fix, the other was
                    refused by the person's mail server and is usually theirs.
                    The word is on the row, not only the colour. */}
                <span className={`pt-pill ${r.status === "bounced" ? "pt-pill--bounced" : "pt-pill--sendfail"}`}>
                  {r.status === "bounced" ? "bounced" : "didn’t send"}
                </span>
              </>
            }
            sub={
              <>
                {r.to ?? "no address"} · {when(r.at)}
                {r.subject ? <> · {r.subject}</> : null}
                {/* The provider's own words. "Mailbox does not exist" is the
                    whole answer and anything friendlier would lose it. */}
                {r.detail ? <><br />{r.detail}</> : null}
              </>
            }
            end={
              <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={pending} onClick={() => press(r.id)}>
                Sorted
              </button>
            }
          />
        ))}
      </Group>
    </>
  );
}
