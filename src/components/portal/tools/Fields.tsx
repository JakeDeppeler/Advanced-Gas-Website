import type { ReactNode, SelectHTMLAttributes } from "react";

/**
 * The trade tools' form parts, in the write-up's clothes (Jake, 28 Nov: the
 * tool pages "look different to the main page"): a label over a pill, the
 * same pill for a select, and a round stepper.
 */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="tt-field"><span>{label}</span>{children}</label>;
}

/** A select in a pill. The chevron is drawn in CSS so it takes the text's colour in both themes. */
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <span className="tt-sel"><select {...props} /></span>;
}

export function Stepper({ label, hint, value, shown, min, max, onChange }: {
  label: string; hint: string; value: number; shown: string; min: number; max: number; onChange: (n: number) => void;
}) {
  return (
    <div className="tt-step">
      <span className="tt-step__t"><b>{label}</b><span>{hint}</span></span>
      <span className="tt-step__ctl">
        <button type="button" aria-label={`Fewer, ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
        <output aria-live="polite">{shown}</output>
        <button type="button" aria-label={`More, ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
      </span>
    </div>
  );
}

/** A card's head, as the home screen's panels have it. */
export function PanelHead({ id, title, note }: { id: string; title: string; note?: string }) {
  return (
    <div className="rp-panel-h">
      <span className="rp-hh"><b id={id}>{title}</b>{note && <span className="rp-note">{note}</span>}</span>
    </div>
  );
}
