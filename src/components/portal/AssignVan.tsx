"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignVehicle } from "@/app/portal/vehicles/actions";

/** Sign a van to someone from their file, rather than going the long way round. */
export function AssignVan({ userId, current, vans }: { userId: string; current: string | null; vans: { id: string; name: string; rego: string | null }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  return (
    <div className="pt-pv__assign">
      <label className="pt-field pt-field--inline">
        <span>Van signed to them</span>
        <select
          value={current ?? ""}
          disabled={pending}
          onChange={(e) => start(async () => {
            setMsg("");
            const res = await assignVehicle({ userId, vehicleId: e.target.value });
            if (res.ok) router.refresh(); else setMsg(res.error || "Couldn't do that.");
          })}
        >
          <option value="">Nobody&rsquo;s van yet</option>
          {vans.map((v) => <option key={v.id} value={v.id}>{v.name}{v.rego ? ` · ${v.rego}` : ""}</option>)}
        </select>
      </label>
      {pending && <span className="pt-inline">Saving…</span>}
      {msg && <span className="pt-inline is-err">{msg}</span>}
    </div>
  );
}
