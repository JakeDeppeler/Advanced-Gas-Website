"use client";

import { useEffect, useState } from "react";
import { site } from "@/lib/site";

/**
 * What it's doing in Pakenham, and whether the office is open, live.
 *
 * The switch strip had the two tabs in the corner and a long empty run to
 * their left. Filling it with a slogan would have been decoration; this is the
 * one piece of live information that is genuinely our business. If it is 6
 * degrees in Pakenham the reader is on a heating page for a reason, and a
 * number that is right now is a small, constant signal that somebody is
 * actually behind the site.
 *
 * Open-Meteo needs no key and no attribution. If it fails, is slow, or the
 * reader is offline, the temperature simply never appears — the open/closed
 * half is computed locally and always renders, so the strip is never empty and
 * never shifts.
 */

const LAT = -38.0708;
const LON = 145.4847;

/** WMO weather codes, grouped to the handful of words worth showing. */
function describe(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Storms";
}

/** The office hours as the reader sees them, straight from site.hours. */
function openNow(): { open: boolean; label: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Melbourne",
    weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = get("weekday");
  const mins = Number(get("hour")) * 60 + Number(get("minute"));

  for (const h of site.hours) {
    const days = h.day.split("-").map((d) => d.trim().slice(0, 3));
    const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const from = order.indexOf(days[0]);
    const to = order.indexOf(days[days.length - 1]);
    const today = order.indexOf(day);
    if (today < from || today > to) continue;
    const [oh, om] = h.open.split(":").map(Number);
    const [ch, cm] = h.close.split(":").map(Number);
    if (mins >= oh * 60 + om && mins < ch * 60 + cm) {
      return { open: true, label: "Open now" };
    }
  }
  return { open: false, label: "After-hours line open" };
}

export function LocalConditions() {
  const [temp, setTemp] = useState<number | null>(null);
  const [sky, setSky] = useState<string | null>(null);
  const [status, setStatus] = useState<{ open: boolean; label: string } | null>(null);

  // Computed on the client only: the server renders in UTC and would hand every
  // reader a status stamped from the wrong side of the world, which then has to
  // correct itself on hydration. Better to arrive once, correct.
  useEffect(() => {
    setStatus(openNow());
    const t = window.setInterval(() => setStatus(openNow()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
        "&current=temperature_2m,weather_code&timezone=Australia%2FMelbourne",
      { signal: ac.signal },
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        const c = d?.current;
        if (typeof c?.temperature_2m === "number") setTemp(Math.round(c.temperature_2m));
        if (typeof c?.weather_code === "number") setSky(describe(c.weather_code));
      })
      .catch(() => { /* No temperature. The strip still reads correctly without it. */ });
    return () => ac.abort();
  }, []);

  return (
    <div className="conds">
      {status && (
        <span className={`conds__status${status.open ? " is-open" : ""}`}>
          <span className="conds__dot" aria-hidden="true" />
          {status.label}
        </span>
      )}
      {temp !== null && (
        <span className="conds__temp">
          {site.address.suburb} <strong>{temp}&deg;</strong>
          {sky && <span className="conds__sky">{sky}</span>}
        </span>
      )}
    </div>
  );
}
