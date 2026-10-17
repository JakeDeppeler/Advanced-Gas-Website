import type { ReactNode } from "react";

/**
 * A settings page's header: the title, one plain line under it, an action on
 * the right, and the long explanation behind "What does this mean?" so it's
 * there for whoever wants it without pushing the page down for everyone else.
 */
export function PageHead({ title, line, info, action }: { title: ReactNode; line?: ReactNode; info?: ReactNode; action?: ReactNode }) {
  return (
    <header className="ph2">
      <div className="ph2-t">
        <h1>{title}</h1>
        {line && <p>{line}</p>}
      </div>
      <div className="ph2-acts">
        {info && (
          <details className="pk-info">
            <summary><span aria-hidden="true">i</span>What does this mean?</summary>
            <div className="pk-infop ph2-info">{info}</div>
          </details>
        )}
        {action}
      </div>
    </header>
  );
}
