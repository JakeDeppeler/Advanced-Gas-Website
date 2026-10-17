"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { setSaleCredit } from "@/app/portal/board/credit/actions";
import { IMPORT_USER, WINDOWS, type CreditTotal, type SoldJob } from "@/lib/dashboard/saleCreditTypes";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;
const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "2-digit" }) : "";

/**
 * Every sale in the window, newest first, with who the board lists it under
 * and a box to change that.
 *
 * Changed per row rather than behind a Save button, like the rest of the
 * board's settings — but unlike them this one moves money between people, so
 * every moved row says so on its face and carries who moved it and when.
 */
export function SaleCredit({
  jobs,
  people,
  moves,
  totals,
  days,
}: {
  jobs: SoldJob[];
  people: string[];
  moves: number;
  totals: CreditTotal[];
  days: number | null;
}) {
  const [rows, setRows] = useState(jobs);
  const [saved, setSaved] = useState<Record<string, "ok" | "err">>({});
  const [who, setWho] = useState<string>("");
  const [, start] = useTransition();

  const shown = useMemo(
    () =>
      who === ""
        ? rows
        : who === "__moved"
          ? rows.filter((r) => r.move)
          : rows.filter((r) => (r.credited ?? "(nobody)") === who),
    [rows, who],
  );

  const change = (job: SoldJob, to: string) => {
    const next = to === "" ? null : to;
    setRows((rs) =>
      rs.map((r) =>
        r.key !== job.key
          ? r
          : {
              ...r,
              credited: next ?? r.original,
              move:
                next == null
                  ? null
                  : { to: next, from: r.move?.from ?? r.original, by: null, at: new Date().toISOString() },
            },
      ),
    );
    start(async () => {
      const res = await setSaleCredit(job.key, next);
      setSaved((s) => ({ ...s, [job.key]: res.ok ? "ok" : "err" }));
    });
  };

  const imported = totals.find((t) => t.who === IMPORT_USER);

  return (
    <>
      {/* Who everything is under, which is the question the page is opened
          with — and the answer is four lines, not four hundred rows. */}
      <div className="pt-panel">
        <div className="pt-panel__head">
          <h2 className="pt-panel__h">Who it&rsquo;s all under</h2>
          <span className="pt-panel__sub">
            {rows.length} {rows.length === 1 ? "sale" : "sales"} · {moves} moved
          </span>
        </div>

        <div className="pt-credit__windows">
          {WINDOWS.map((w) => (
            <Link
              key={w.label}
              href={`/portal/board/credit?d=${w.days ?? "all"}`}
              className={`pt-seg__b ${days === w.days ? "is-on" : ""}`}
            >
              {w.label}
            </Link>
          ))}
        </div>

        <div className="pt-credit__who">
          {totals.length === 0 && <span className="pt-panel__sub">Nothing has sold in this window.</span>}
          {totals.map((t) => (
            <button
              key={t.who}
              type="button"
              className={`pt-credit__card ${who === t.who ? "is-on" : ""}`}
              onClick={() => setWho(who === t.who ? "" : t.who)}
            >
              <span className="pt-credit__name">{t.who === IMPORT_USER ? "ServiceTitan import" : t.who}</span>
              <b className="pt-credit__value">{money(t.value)}</b>
              <span className="pt-credit__meta">
                {t.jobs} {t.jobs === 1 ? "sale" : "sales"}
                {t.moved > 0 ? ` · ${t.moved} moved here` : ""}
              </span>
            </button>
          ))}
        </div>

        {imported && (
          /* Said once, plainly: the integration account is not somebody who
             sold anything. Everything before September 2026 is under it,
             because that is when the office started writing estimates in
             ServiceTitan under their own names. Those sales cannot be given
             back to a person by this page or any other — nothing recorded who
             made them. */
          <p className="pt-note">
            <strong>{money(imported.value)}</strong> of this is under the ServiceTitan integration account rather than a
            person. Everything sold before September 2026 is, because nothing recorded who sold it, moving those is a
            guess, not a correction.
          </p>
        )}
      </div>

      <div className="pt-panel">
        <div className="pt-panel__head">
          <h2 className="pt-panel__h">
            {who === "" ? "Every sale" : who === "__moved" ? "Moved" : who === IMPORT_USER ? "ServiceTitan import" : who}
          </h2>
          <span className="pt-panel__sub">
            {shown.length} of {rows.length}
            {/* The separator belongs to the link, not to the filter: without it
                the count ran straight into the words ("21 of 21just the moved
                ones") on the one path that has no filter set. */}
            {who !== "" ? (
              <>
                {" · "}
                <button type="button" className="pt-inline" onClick={() => setWho("")}>
                  show all
                </button>
              </>
            ) : moves > 0 ? (
              <>
                {" · "}
                <button type="button" className="pt-inline" onClick={() => setWho("__moved")}>
                  just the moved ones
                </button>
              </>
            ) : null}
          </span>
        </div>

        <table className="pt-table pt-credit">
          <thead>
            <tr>
              <th>Job</th>
              <th className="pt-credit__n">Sold</th>
              <th className="pt-credit__n">Value</th>
              <th className="pt-credit__set">Listed under</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={4}>Nothing here.</td>
              </tr>
            )}
            {shown.map((j) => {
              // ServiceTitan's own Sold By, where it has one and it is not the
              // person who wrote the quote. It is ServiceTitan saying the exact
              // thing this page records, so the row offers it rather than
              // making somebody find the name in the list.
              const st = j.soldBy && j.soldBy !== j.original && j.soldBy !== IMPORT_USER ? j.soldBy : null;
              return (
                <tr key={j.key}>
                  <td>
                    <strong>{j.customer ?? (j.jobNumber ? `Job ${j.jobNumber}` : "Quote")}</strong>
                    <span className="pt-credit__where">
                      {[j.jobNumber ? `#${j.jobNumber}` : "quote with no job on it", j.suburb]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {j.move ? (
                      <span className="pt-credit__moved">
                        moved from {j.move.from ?? "nobody"}
                        {j.move.by ? ` by ${j.move.by}` : ""}
                        {j.move.at ? ` on ${day(j.move.at)}` : ""}
                      </span>
                    ) : st ? (
                      <span className="pt-credit__st">
                        ServiceTitan says {st} sold it ·{" "}
                        <button type="button" className="pt-inline" onClick={() => change(j, st)}>
                          use that
                        </button>
                      </span>
                    ) : null}
                  </td>
                  <td className="pt-credit__n">{day(j.soldOn)}</td>
                  <td className="pt-credit__n">{money(j.value)}</td>
                  <td className="pt-credit__set">
                    <select
                      className="pt-credit__pick"
                      value={j.move ? j.move.to : ""}
                      onChange={(e) => change(j, e.target.value)}
                    >
                      {/* Always first, always named: the way back is a thing
                          somebody has to be able to find without remembering
                          who had it. */}
                      <option value="">
                        {(j.original === IMPORT_USER ? "ServiceTitan import" : j.original) ?? "nobody"} , unchanged
                      </option>
                      {people.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    {saved[j.key] === "err" ? <span className="pt-inline is-err">not saved</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
