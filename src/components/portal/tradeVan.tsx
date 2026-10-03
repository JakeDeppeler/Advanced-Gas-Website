import Link from "next/link";
import type { Vehicle } from "@/lib/portal/db";
import { dbConfigured } from "@/lib/portal/db";
import { Ic } from "@/components/portal/TradeShell";
import { shortDate } from "@/lib/portal/vanParts";

const DAY = 86_400_000;

/**
 * The van's card at the top of My van: name, rego, who has it, and the three
 * numbers anybody asks about it.
 *
 * A figure the office hasn't entered says so in words rather than reading as a
 * zero, and one that is close or past turns orange — the word "due" carries it
 * too, so the colour is never the only signal.
 */
export function VanHead({ van, who, today }: { van: Vehicle; who: string; today: Date }) {
  const kmTo = van.nextServiceKm != null && van.odometer != null ? van.nextServiceKm - van.odometer : null;
  const service = van.nextServiceKm != null
    ? { v: `${van.nextServiceKm.toLocaleString("en-AU")} km`, warn: kmTo != null && kmTo <= 2000, note: kmTo != null && kmTo <= 0 ? "due now" : kmTo != null && kmTo <= 2000 ? "due soon" : null }
    : van.nextServiceDate
      ? { v: shortDate(van.nextServiceDate), warn: Date.parse(`${van.nextServiceDate}T00:00:00Z`) - today.getTime() <= 21 * DAY, note: null }
      : { v: "Not set", warn: false, note: null };
  const regoDays = van.regoDue ? (Date.parse(`${van.regoDue}T00:00:00Z`) - today.getTime()) / DAY : null;

  return (
    <section className="tr-card tr-vanhead" style={{ padding: "16px 22px" }}>
      <span className="tr-vanhead__ic"><Ic n="van" size={28} /></span>
      <div className="tr-vanhead__name">
        <strong>{van.name}{van.rego ? ` · ${van.rego}` : ""}</strong>
        <span className="tr-muted">{who}{van.status === "repair" ? " · in for repair" : van.status === "off" ? " · off the road" : ""}</span>
      </div>
      <div className="tr-vanhead__facts">
        <div className="tr-vanhead__fact">
          <span>Odometer</span>
          <strong>{van.odometer != null ? `${van.odometer.toLocaleString("en-AU")} km` : "No reading"}</strong>
        </div>
        <div className="tr-vanhead__fact">
          <span>Next service{service.note ? ` · ${service.note}` : ""}</span>
          <strong className={service.warn ? "is-warn" : undefined}>{service.v}</strong>
        </div>
        <div className="tr-vanhead__fact">
          <span>Rego due{regoDays != null && regoDays <= 30 ? (regoDays < 0 ? " · overdue" : " · soon") : ""}</span>
          <strong className={regoDays != null && regoDays <= 30 ? "is-warn" : undefined}>{van.regoDue ? shortDate(van.regoDue) : "Not set"}</strong>
        </div>
      </div>
    </section>
  );
}

export function NoVan() {
  return (
    <section className="tr-card tr-stack">
      <h2>No van is signed to you</h2>
      <p className="tr-muted">
        {dbConfigured()
          ? "The office signs vans to people on the fleet page. Once yours is signed over, its checks, reports, parts and tools show up here."
          : "The database isn't connected yet, so there's nothing to read."}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/trade/stock" className="tr-btn">Factory stock</Link>
        <Link href="/trade" className="tr-btn tr-btn--navy">Back to home</Link>
      </div>
    </section>
  );
}

/** A report's or order's chip. */
export function Chip({ c }: { c: { label: string; tone: string } }) {
  return <span className={`tr-chip tr-chip--${c.tone}`}>{c.label}</span>;
}
