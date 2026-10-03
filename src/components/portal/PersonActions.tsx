"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLoginEmail } from "@/app/portal/admin/team/actions";
import { startPreview } from "@/app/portal/admin/viewAsActions";

type Props = {
  userId: string;
  /** Their first name, for the button face — "See it as Jye does". */
  first: string;
  level: string | null;
  hasEmail: boolean;
  canManage: boolean;
};

/**
 * The two actions in the top right of a person's file.
 *
 * They sit together because both are "do something to this person's account",
 * and both are the manager's alone — a crew member looking at a colleague's
 * file gets the header without them rather than buttons that refuse.
 */
export function PersonActions({ userId, first, level, hasEmail, canManage }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (!canManage) return null;

  const save = () =>
    start(async () => {
      const res = await setLoginEmail({ id: userId, email });
      if (!res.ok) return setErr(res.error ?? "Couldn't save.");
      setErr(null);
      setOpen(false);
      router.refresh();
    });

  return (
    <div className="pt-pacts">
      <div className="pt-pacts__row">
        {!hasEmail && (
          <button type="button" className="pt-btn pt-btn--navy" onClick={() => setOpen((o) => !o)}>
            Add login email
          </button>
        )}
        {level && (
          <button
            type="button"
            className="pt-btn pt-btn--ghost"
            disabled={pending}
            onClick={() => start(async () => { await startPreview(level); router.push("/portal"); router.refresh(); })}
          >
            See it as {first} does
          </button>
        )}
      </div>

      {open && (
        <div className="pt-pacts__form">
          <label htmlFor="pt-login-email">Their email</label>
          <input
            id="pt-login-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErr(null); }}
            placeholder="jye@advancedgas.com.au"
          />
          <p className="pt-pacts__note">
            They&rsquo;ll be able to sign in with this straight away, as a {level ?? "crew member"}.
          </p>
          <div className="pt-pacts__row">
            <button type="button" className="pt-btn pt-btn--orange pt-btn--sm" disabled={pending || !email} onClick={save}>
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={pending} onClick={() => { setOpen(false); setErr(null); }}>
              Cancel
            </button>
          </div>
          {err && <p className="pt-pacts__err">{err}</p>}
        </div>
      )}
    </div>
  );
}
