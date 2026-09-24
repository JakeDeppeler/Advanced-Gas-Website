"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { COMM_GALLERY } from "@/lib/commercial";

/**
 * One commercial fit-out, photographed by the crew on the job.
 *
 * Every other proof on this page is a claim you have to take our word for:
 * a licence number, a client name, a procedure count. These are the only
 * part of it you can check yourself, so they are set large — the first
 * photograph takes two columns and two rows — and the captions say what is
 * in frame rather than selling it.
 *
 * Tapping one opens it full size. That is a real `<dialog>` rather than a
 * div with a high z-index, which means Escape closes it, focus is trapped
 * inside it and returned to the photograph you opened, and the page behind
 * is inert — all of it from the platform, none of it from us.
 */

export function CommGallery() {
  const [at, setAt] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement | null>(null);

  const close = useCallback(() => {
    dialog.current?.close();
  }, []);

  // showModal() has to be called rather than rendered, so the open state
  // drives it through an effect. Closing is left to the dialog's own
  // `close` event so Escape and the button end up in the same place.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (at === null) {
      if (el.open) el.close();
      return;
    }
    if (!el.open) el.showModal();
  }, [at]);

  const shot = at === null ? null : COMM_GALLERY[at];

  return (
    <>
      <div className="cx-gal">
        {COMM_GALLERY.map((g, i) => (
          <button
            key={g.src}
            type="button"
            className={`cx-gal__i${g.big ? " cx-gal__i--big" : ""} cx-rv`}
            style={{ ["--i" as string]: String(i % 4) }}
            onClick={() => setAt(i)}
          >
            <Image
              src={g.src}
              alt={g.cap}
              fill
              sizes={g.big ? "(max-width: 760px) 100vw, 590px" : "(max-width: 760px) 50vw, 295px"}
              style={{ objectFit: "cover" }}
            />
            <span>{g.cap}</span>
          </button>
        ))}
      </div>

      <dialog
        className="cx-lb"
        ref={dialog}
        onClose={() => setAt(null)}
        onClick={(e) => {
          // The backdrop is the dialog itself: a click that lands on the
          // element rather than on the photograph inside it closes.
          if (e.target === e.currentTarget) close();
        }}
      >
        {shot && (
          <>
            <button type="button" className="cx-lb__x" onClick={close} aria-label="Close">
              ×
            </button>
            <Image src={shot.src} alt={shot.cap} width={600} height={800} sizes="min(92vw, 720px)" />
            <p>{shot.cap}</p>
          </>
        )}
      </dialog>
    </>
  );
}
