"use client";

import { useEffect, useState } from "react";
import { jobFiles } from "@/app/portal/supply/work-orders/actions";
import type { JobFile } from "@/lib/ordering/jobFiles";

export type PickedFile = { id: number; name: string };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Melbourne" });
/** Photos a browser can draw. HEIC, as iPhones save them, isn't one, so it's listed with the files. */
const isPhoto = (name: string) => /\.(jpe?g|png|gif|webp)$/i.test(name);
const kind = (name: string) => (name.match(/\.([a-z0-9]{1,5})$/i)?.[1] ?? "file").toUpperCase();
const src = (id: number) => `/api/portal/job-file?id=${id}`;

/** A photo's preview, or a plain tile saying there isn't one, so a broken image never stands in for it. */
function Thumb({ f }: { f: JobFile }) {
  const [failed, setFailed] = useState(false);
  return failed
    ? <span className="wo-thumb none">No preview</span>
    // eslint-disable-next-line @next/next/no-img-element -- the job's own file, through the portal, not an asset next/image could size
    : <img className="wo-thumb" src={src(f.id)} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

/**
 * The job's files in ServiceTitan, ticked to go with the work order: photos
 * as pictures, so it's plain which ones are going, and the rest by name, each
 * with a View link. None are ticked to start: a job's files can include the
 * customer's invoice.
 */
export function JobFilesPicker({ jobId, jobNumber, picked, onChange, photosGo = false }: {
  jobId: number; jobNumber: string; picked: PickedFile[]; onChange: (p: PickedFile[]) => void;
  /** Every photo on the job, and on the job it was quoted on, is sent by itself (jobFilesFor), so they needn't be ticked. Every work order since 31 Oct. */
  photosGo?: boolean;
}) {
  const [state, setState] = useState<{ files: JobFile[] } | { error: string } | null>(null);
  useEffect(() => {
    let live = true;
    setState(null);
    jobFiles(jobId).then((r) => { if (live) setState(r); }).catch(() => { if (live) setState({ error: "The job's files couldn't be read just now." }); });
    return () => { live = false; };
  }, [jobId]);
  const on = new Set(picked.map((p) => p.id));
  const toggle = (f: JobFile) => onChange(on.has(f.id) ? picked.filter((p) => p.id !== f.id) : [...picked, { id: f.id, name: f.name }]);
  const files = state && "files" in state ? state.files : [];
  const photos = files.filter((f) => isPhoto(f.name));
  const others = files.filter((f) => !isPhoto(f.name));
  const allPhotos = photos.length > 0 && photos.every((f) => on.has(f.id));
  const setPhotos = (tick: boolean) => {
    const ids = new Set(photos.map((f) => f.id));
    const rest = picked.filter((p) => !ids.has(p.id));
    onChange(tick ? [...rest, ...photos.map((f) => ({ id: f.id, name: f.name }))] : rest);
  };
  const view = (f: JobFile) => <a className="wo-view" href={src(f.id)} target="_blank" rel="noreferrer" aria-label={`View ${f.name}`}>View ↗</a>;

  return (
    <fieldset className="wo-files">
      <legend>Send files from job {jobNumber}{picked.length ? <span className="wo-count">{picked.length} ticked</span> : null}</legend>
      {state === null ? (
        <p className="qp-note">Looking at the job in ServiceTitan…</p>
      ) : "error" in state ? (
        <p className="pk-said bad">{state.error}</p>
      ) : files.length === 0 ? (
        <p className="qp-note">There are no files on this job in ServiceTitan.</p>
      ) : (
        <>
          {photos.length > 0 && (
            <div className="wo-fgroup">
              <div className="wo-fgh">
                <b>Photos ({photos.length})</b>
                {!photosGo && <button type="button" className="qp-btn line sm" onClick={() => setPhotos(!allPhotos)}>{allPhotos ? "Untick all photos" : "Tick all photos"}</button>}
              </div>
              {photosGo && <p className="qp-note">Every photo on the job, and on the quote visit&rsquo;s job, goes with the work order by itself, the newest {photos.length > 20 ? "20" : "ones"} first. Nothing to tick.</p>}
              <ul className="wo-photos">
                {photos.map((f) => (
                  <li key={f.id} className={on.has(f.id) ? "on" : undefined}>
                    <label htmlFor={`wo-file-${f.id}`}>
                      <Thumb f={f} />
                      {on.has(f.id) && <span className="wo-tick" aria-hidden="true">✓ Sending</span>}
                      <span className="wo-pcap">
                        <input type="checkbox" id={`wo-file-${f.id}`} checked={on.has(f.id)} onChange={() => toggle(f)} />
                        <span className="wo-fname">{f.name}</span>
                      </span>
                    </label>
                    <span className="wo-pfoot">{f.at ? <span className="wo-fat">added {day(f.at)}</span> : <span />}{view(f)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {others.length > 0 && (
            <div className="wo-fgroup">
              {photos.length > 0 && <div className="wo-fgh"><b>Other files ({others.length})</b></div>}
              <ul className="wo-flist">
                {others.map((f) => (
                  <li key={f.id} className={on.has(f.id) ? "on" : undefined}>
                    <label htmlFor={`wo-file-${f.id}`}>
                      <input type="checkbox" id={`wo-file-${f.id}`} checked={on.has(f.id)} onChange={() => toggle(f)} />
                      <span className="wo-kind">{kind(f.name)}</span>
                      <span className="wo-fname">{f.name}</span>
                      {f.at && <span className="wo-fat">added {day(f.at)}</span>}
                    </label>
                    {view(f)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      {/* Ticked before and since taken off the job: still sent, so still shown. */}
      {state && "files" in state && picked.filter((p) => !state.files.some((f) => f.id === p.id)).map((p) => (
        <p key={p.id} className="qp-note">Still ticked: {p.name} (no longer on the job) <button type="button" className="wo-x" aria-label={`Don't send ${p.name}`} onClick={() => onChange(picked.filter((x) => x.id !== p.id))}>×</button></p>
      ))}
    </fieldset>
  );
}
