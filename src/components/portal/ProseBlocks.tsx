import { Fragment } from "react";
import { boldRuns, parseProse } from "@/lib/portal/prose";

const Line = ({ text }: { text: string }) => (
  <>{boldRuns(text).map((r, i) => (r.strong ? <strong key={i}>{r.text}</strong> : <Fragment key={i}>{r.text}</Fragment>))}</>
);

/**
 * A handbook body, drawn. One renderer for the office's reader, its editor
 * preview and the van's iPad, so the three can't disagree about what a topic
 * looks like.
 */
export function ProseBlocks({ body, heading = "h2", headingStyle }: { body: string; heading?: "h2" | "h3"; headingStyle?: React.CSSProperties }) {
  const H = heading;
  return (
    <>
      {parseProse(body, { numbered: true }).map((b, i) =>
        b.kind === "h" ? <H key={i} style={headingStyle}><Line text={b.text} /></H>
        : b.kind === "ul" ? <ul key={i}>{b.items.map((it, j) => <li key={j}><Line text={it} /></li>)}</ul>
        : b.kind === "ol" ? <ol key={i}>{b.items.map((it, j) => <li key={j}><Line text={it} /></li>)}</ol>
        : <p key={i}><Line text={b.text} /></p>,
      )}
    </>
  );
}
