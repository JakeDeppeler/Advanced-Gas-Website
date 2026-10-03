"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CREW_LEVELS, type CrewLevel } from "@/lib/portal/crew";
import { addCrewPerson } from "@/app/portal/finance/capacity/actions";

/** The add form, open — reached from the head's "+ Add a person" (`?add=1`). */
export function AddTeamPerson({ doneHref }: { doneHref: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState<CrewLevel>("tradesman");
  const [msg, setMsg] = useState("");

  function submit() {
    setMsg("");
    start(async () => {
      const res = await addCrewPerson({ name, email, level });
      if (res.ok) {
        setName(""); setEmail(""); setLevel("tradesman");
        router.push(doneHref);
        router.refresh();
      } else {
        setMsg(res.error || "Couldn't add them.");
      }
    });
  }

  return (
    <section className="pt-panel">
      <h2 className="pt-panel__h">Add a person</h2>
      <p className="pt-panel__sub">Name and level. Email is optional — add one so they can sign in, or leave it blank for someone you only want on the crew for costing.</p>
      <div className="pt-cap__addform">
        <input className="pt-cap__name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="pt-cap__addemail" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select className="pt-cap__type" value={level} onChange={(e) => setLevel(e.target.value as CrewLevel)}>
          {CREW_LEVELS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
        </select>
        <Link href={doneHref} className="pt-btn pt-btn--ghost pt-btn--sm">Cancel</Link>
        <button type="button" className="pt-btn pt-btn--orange pt-btn--sm" onClick={submit} disabled={pending || !name.trim()}>Add</button>
      </div>
      {msg && <div className="pt-inline is-err" style={{ marginTop: 8 }}>{msg}</div>}
    </section>
  );
}
