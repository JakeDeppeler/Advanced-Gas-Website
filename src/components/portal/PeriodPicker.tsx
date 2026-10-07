"use client";

import { useRouter } from "next/navigation";

/** A dropdown of periods that goes straight to the one picked: `${hrefPrefix}${key}`. */
export function PeriodPicker({ label, value, options, hrefPrefix }: { label: string; value: string; options: Array<{ key: string; label: string }>; hrefPrefix: string }) {
  const router = useRouter();
  return (
    <label className="pt-rev__pick">
      <span className="pt-sr">{label}</span>
      <select value={value} onChange={(e) => router.push(`${hrefPrefix}${e.target.value}`)} aria-label={label}>
        {!options.some((o) => o.key === value) && <option value={value}>Pick one…</option>}
        {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    </label>
  );
}
