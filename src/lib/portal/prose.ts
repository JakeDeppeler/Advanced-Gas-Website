/**
 * The smallest markup a handbook topic needs.
 *
 * Blank line splits a paragraph, "## " is a heading, "- " is a list item.
 * That is the whole language. A rich-text editor would mean a schema, a
 * sanitiser and a toolbar nobody asked for — and the thing being written here
 * is prose with the occasional list, which this covers.
 *
 * Pure, so what the editor previews and what the page renders cannot drift.
 */

export type ProseBlock =
  | { kind: "h"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] };

export function parseProse(body: string): ProseBlock[] {
  const out: ProseBlock[] = [];
  // Split on blank lines, then decide what each chunk is.
  for (const chunk of body.replace(/\r\n/g, "\n").split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // A chunk whose every line is a bullet is one list, however long.
    if (lines.every((l) => l.startsWith("- "))) {
      out.push({ kind: "ul", items: lines.map((l) => l.slice(2).trim()) });
      continue;
    }

    for (const line of lines) {
      if (line.startsWith("## ")) out.push({ kind: "h", text: line.slice(3).trim() });
      else if (line.startsWith("- ")) {
        // A stray bullet among paragraphs joins the list above it rather than
        // becoming a one-item list of its own.
        const last = out[out.length - 1];
        if (last?.kind === "ul") last.items.push(line.slice(2).trim());
        else out.push({ kind: "ul", items: [line.slice(2).trim()] });
      } else out.push({ kind: "p", text: line });
    }
  }
  return out;
}

/** Roughly how long it takes to read, for the line under the title. */
export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
