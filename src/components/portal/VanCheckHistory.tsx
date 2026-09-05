"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeVanCheck, removeVanPhoto } from "@/app/portal/vehicles/actions";
import type { CheckKind, ShortItem } from "@/lib/portal/vanChecks";

export type CheckView = {
  id: string; kind: CheckKind; label: string; when: string;
  by: string | null; notes: string | null;
  actions: { item: string; note: string }[];
  short: ShortItem[];
  photos: { id: string; label: string | null; url: string | null }[];
};

export function VanCheckHistory({ checks, vehicleId, canManage }: { checks: CheckView[]; vehicleId: string; canManage: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<string | null>(checks[0]?.id ?? null);
  const [zoom, setZoom] = useState<string | null>(null);

  if (checks.length === 0) {
    return <div className="pf-empty">Nothing checked yet. Pick a sheet above to start one.</div>;
  }

  return (
    <>
      <section className="pt-panel">
        <h2 className="pt-panel__h">What&rsquo;s been done <span className="pt-tm__count">{checks.length}</span></h2>
        <div className="pt-vc__hist">
          {checks.map((c) => {
            const isOpen = open === c.id;
            const flags = c.actions.length + c.short.length;
            return (
              <div key={c.id} className={`pt-vc__histrow${isOpen ? " is-open" : ""}`}>
                <button type="button" className="pt-vc__histhead" onClick={() => setOpen(isOpen ? null : c.id)} aria-expanded={isOpen}>
                  <span className="pt-vc__histid">
                    <strong>{c.label}</strong>
                    <span>{c.when}{c.by ? ` · ${c.by}` : ""}</span>
                  </span>
                  <span className="pt-vc__histtags">
                    {c.photos.length > 0 && <span className="pt-vc__tag">{c.photos.length} {c.photos.length === 1 ? "photo" : "photos"}</span>}
                    {flags > 0
                      ? <span className="pt-vc__tag pt-vc__tag--flag">{flags} to sort</span>
                      : <span className="pt-vc__tag pt-vc__tag--ok">All clear</span>}
                  </span>
                </button>

                {isOpen && (
                  <div className="pt-vc__histbody">
                    {c.actions.length > 0 && (
                      <div className="pt-vc__block">
                        <div className="pt-vc__blockh">Needs doing</div>
                        {c.actions.map((a) => (
                          <div key={a.item} className="pt-vc__actionrow"><strong>{a.item}</strong>{a.note && <span>{a.note}</span>}</div>
                        ))}
                      </div>
                    )}

                    {c.short.length > 0 && (
                      <div className="pt-vc__block">
                        <div className="pt-vc__blockh">To order</div>
                        {c.short.map((s) => (
                          <div key={`${s.group}|${s.item}`} className="pt-vc__actionrow">
                            <strong>{s.item}</strong><span>{s.qty} on van · min {s.min} {s.unit} · {s.group}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {c.photos.length > 0 && (
                      <div className="pt-vc__block">
                        <div className="pt-vc__blockh">Photos</div>
                        <div className="pt-vc__shots">
                          {c.photos.map((p) => (
                            <figure key={p.id} className="pt-vc__shot">
                              {p.url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.url} alt={p.label ?? "Van photo"} onClick={() => setZoom(p.url)} />
                              ) : (
                                <div className="pt-vc__shotmissing">Photo unavailable</div>
                              )}
                              <figcaption>{p.label ?? "Van"}</figcaption>
                              {canManage && (
                                <button type="button" className="pf-x" aria-label="Delete photo" disabled={pending}
                                  onClick={() => start(async () => { await removeVanPhoto({ id: p.id, vehicleId }); router.refresh(); })}>×</button>
                              )}
                            </figure>
                          ))}
                        </div>
                      </div>
                    )}

                    {c.notes && (
                      <div className="pt-vc__block">
                        <div className="pt-vc__blockh">Notes</div>
                        <p className="pt-vc__notes">{c.notes}</p>
                      </div>
                    )}

                    {c.actions.length === 0 && c.short.length === 0 && c.photos.length === 0 && !c.notes && (
                      <p className="pt-vc__notes">Everything was in order.</p>
                    )}

                    {canManage && (
                      <button type="button" className="pt-btn pt-btn--danger pt-btn--sm" disabled={pending}
                        onClick={() => start(async () => { await removeVanCheck({ id: c.id, vehicleId }); router.refresh(); })}>Delete this check</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {zoom && (
        <div className="pt-vc__lightbox" role="dialog" aria-label="Photo" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="Van photo" />
          <button type="button" className="pt-vc__close" aria-label="Close">×</button>
        </div>
      )}
    </>
  );
}
