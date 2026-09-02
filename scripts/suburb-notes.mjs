#!/usr/bin/env node
/**
 * Suburb notes: worksheet out, answers in.
 *
 *   node scripts/suburb-notes.mjs template [n]
 *       Writes docs/suburb-notes.md: a fill-in worksheet covering the
 *       n nearest suburbs that are still missing fields (default 15).
 *
 *   node scripts/suburb-notes.mjs import <file>
 *       Reads a filled-in worksheet and writes the answers into
 *       src/lib/suburbs.ts.
 *
 * Why this exists: the four fields that make a suburb page worth
 * indexing (whyLocal, commonProblems, knownEstates, testimonial) can
 * only come out of Jake's and Chaz's heads. Nobody is going to edit a
 * 3,000-line TypeScript file from a phone at a job site, so the
 * worksheet is plain text and this script does the editing.
 *
 * The importer never invents anything and never overwrites a field
 * that already has content, so running it twice is safe.
 */

import { readFileSync, writeFileSync } from "node:fs";

const SUBURBS = "src/lib/suburbs.ts";
const WORKSHEET = "docs/suburb-notes.md";

/* ------------------------------------------------------------------ */
/* Parsing suburbs.ts                                                  */
/* ------------------------------------------------------------------ */

/** Every published suburb, with the character range of its object
 *  literal so we can splice fields into the right one. Brace counting
 *  rather than a regex, because the records contain braces. */
function readSuburbs(src) {
  const out = [];
  const re = /\n  \{\n    slug: "([a-z0-9-]+)",/g;
  let m;
  while ((m = re.exec(src))) {
    const start = m.index + 1;
    let i = src.indexOf("{", start);
    let depth = 0;
    let end = i;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }
    const body = src.slice(start, end);
    if (!body.includes("published: true")) continue;
    out.push({
      slug: m[1],
      name: (body.match(/name: "([^"]+)"/) || [])[1] ?? m[1],
      km: Number((body.match(/distanceKm: (\d+)/) || [])[1] ?? 999),
      council: (body.match(/council: "([^"]+)"/) || [])[1] ?? "",
      housing: (body.match(/housingStock:\s*\n?\s*"([\s\S]*?)",\n/) || [])[1] ?? "",
      has: {
        whyLocal: /\n\s{4}whyLocal:/.test(body),
        commonProblems: /\n\s{4}commonProblems:/.test(body),
        knownEstates: /\n\s{4}knownEstates:/.test(body),
        testimonial: /\n\s{4}testimonial:/.test(body),
      },
      start,
      end,
    });
  }
  return out.sort((a, b) => a.km - b.km);
}

/* ------------------------------------------------------------------ */
/* template                                                            */
/* ------------------------------------------------------------------ */

function template(limit) {
  const src = readFileSync(SUBURBS, "utf8");
  const subs = readSuburbs(src);
  const todo = subs
    .filter((s) => Object.values(s.has).some((v) => !v))
    .slice(0, limit);

  const done = subs.length - subs.filter((s) => Object.values(s.has).some((v) => !v)).length;

  const lines = [];
  lines.push("# Suburb notes worksheet");
  lines.push("");
  lines.push("Fill in what you know. Skip what you don't. Anything left blank");
  lines.push("stays as it is, so this is safe to do in bits.");
  lines.push("");
  lines.push("When it's filled in:");
  lines.push("");
  lines.push("```");
  lines.push("node scripts/suburb-notes.mjs import docs/suburb-notes.md");
  lines.push("```");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## The rules");
  lines.push("");
  lines.push("**Testimonials must be real.** A real customer, a real job, and");
  lines.push("either a review they've already left publicly or a customer who has");
  lines.push("said yes. Made-up quotes are fake reviews. Don't, and I won't");
  lines.push("write them for you either. If a suburb has no real quote, leave it");
  lines.push("blank; the page works without one.");
  lines.push("");
  lines.push("**Everything else should be specific enough that a competitor");
  lines.push("couldn't guess it.** \"Older homes, lots of gas heating\" is worth");
  lines.push("nothing, because it's true of forty suburbs and Google can see");
  lines.push("that. \"The Rinnai tanks that went in with the Cameron Park estate");
  lines.push("build are all hitting fifteen years at once\" is worth a lot,");
  lines.push("because only someone who has been on those streets knows it.");
  lines.push("");
  lines.push("**Write how you talk.** This gets published close to verbatim.");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## The format");
  lines.push("");
  lines.push("```");
  lines.push("# suburb-slug");
  lines.push("why: One paragraph. Why we're actually embedded here. Jobs done,");
  lines.push("     sponsorships, who lives here, how long we've worked it.");
  lines.push("estates: The estates, streets or precincts you know by name.");
  lines.push("problem: One thing that goes wrong here, and why.");
  lines.push("problem: Another. Three or four is plenty.");
  lines.push("quote: What they said | Their name, Suburb | What the job was");
  lines.push("```");
  lines.push("");
  lines.push("`problem:` can repeat. Everything else appears once. A line can run");
  lines.push("as long as you like; wrap it if it helps you read it.");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Worked example, already in the site");
  lines.push("");
  lines.push("```");
  lines.push("# pakenham");
  lines.push("why: This is where we live and work. Our workshop's on Sierra Circuit,");
  lines.push("     our kids go to Pakenham Consolidated, and we sponsor the Pakenham");
  lines.push("     Bombers each year. We've done more than 400 Pakenham installs in");
  lines.push("     the last five years.");
  lines.push("estates: Cameron Park, Lakeside, Arena, Heritage Springs, Timbertop.");
  lines.push("problem: 15-year-old Rinnai gas storage tanks in Cameron Park hitting");
  lines.push("         end-of-life all at once, they went in during the estate build.");
  lines.push("problem: Original electric-storage tanks in the older Main Street");
  lines.push("         cottages, perfect VEU rebate territory.");
  lines.push("```");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`## To do (${todo.length} of ${subs.length} suburbs, nearest first)`);
  lines.push("");
  lines.push(`${done} already complete. Do these in order, because a suburb we`);
  lines.push("work every week is worth more than one we visit twice a year.");
  lines.push("");
  lines.push("Copy the blocks below into a new file, or fill them in here.");
  lines.push("");

  for (const s of todo) {
    const need = Object.entries(s.has).filter(([, v]) => !v).map(([k]) => k);
    lines.push("```");
    lines.push(`# ${s.slug}`);
    lines.push(`# ${s.name}, ${s.km} km, ${s.council}`);
    if (s.housing) lines.push(`# already on file: ${s.housing.replace(/\s+/g, " ").slice(0, 150)}`);
    lines.push(`# still needs: ${need.join(", ")}`);
    if (!s.has.whyLocal) lines.push("why: ");
    if (!s.has.knownEstates) lines.push("estates: ");
    if (!s.has.commonProblems) { lines.push("problem: "); lines.push("problem: "); lines.push("problem: "); }
    if (!s.has.testimonial) lines.push("quote:  |  | ");
    lines.push("```");
    lines.push("");
  }

  writeFileSync(WORKSHEET, lines.join("\n"));
  console.log(`Wrote ${WORKSHEET}: ${todo.length} suburbs to fill, ${done} already done.`);
}

/* ------------------------------------------------------------------ */
/* import                                                              */
/* ------------------------------------------------------------------ */

/** Parses the worksheet. Ignores markdown fences, comment lines and
 *  anything before the first `# slug`. */
function parseAnswers(text) {
  const answers = new Map();
  let cur = null;
  let key = null;

  const flush = () => { key = null; };

  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (/^\s*```/.test(line)) { flush(); continue; }

    const head = line.match(/^#\s+([a-z0-9-]+)\s*$/);
    if (head) {
      cur = head[1];
      if (!answers.has(cur)) answers.set(cur, { problems: [] });
      flush();
      continue;
    }
    if (/^\s*#/.test(line)) { flush(); continue; }   // comment line
    if (!cur) continue;

    const field = line.match(/^(why|estates|problem|quote):\s*(.*)$/);
    if (field) {
      const [, k, v] = field;
      const a = answers.get(cur);
      if (k === "problem") { a.problems.push(v.trim()); key = "problem"; }
      else { a[k] = v.trim(); key = k; }
      continue;
    }

    // Continuation of the previous field: an indented line with content.
    if (key && /^\s+\S/.test(line)) {
      const a = answers.get(cur);
      const extra = line.trim();
      if (key === "problem") a.problems[a.problems.length - 1] += " " + extra;
      else a[key] = (a[key] + " " + extra).trim();
    }
  }

  // Drop anything left empty by the template.
  for (const [slug, a] of answers) {
    a.problems = a.problems.filter((p) => p.length > 2);
    if (a.why !== undefined && a.why.length < 3) delete a.why;
    if (a.estates !== undefined && a.estates.length < 3) delete a.estates;
    if (a.quote !== undefined) {
      const parts = a.quote.split("|").map((x) => x.trim());
      if (parts.filter(Boolean).length < 3) delete a.quote;
      else a.quote = { quote: parts[0], who: parts[1], what: parts[2] };
    }
    const empty = !a.why && !a.estates && !a.quote && a.problems.length === 0;
    if (empty) answers.delete(slug);
  }
  return answers;
}

/** TypeScript string literal, double-quoted, escaped. */
function lit(s) {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function doImport(file) {
  const answers = parseAnswers(readFileSync(file, "utf8"));
  if (!answers.size) {
    console.log("Nothing filled in. No changes made.");
    return;
  }

  let src = readFileSync(SUBURBS, "utf8");
  let added = 0;
  const touched = [];

  // Back to front, so earlier offsets stay valid as we splice.
  const subs = readSuburbs(src).sort((a, b) => b.start - a.start);

  for (const sub of subs) {
    const a = answers.get(sub.slug);
    if (!a) continue;

    const fields = [];
    if (a.quote && !sub.has.testimonial) {
      fields.push(
        `    testimonial: {\n      who: ${lit(a.quote.who)},\n      what: ${lit(a.quote.what)},\n      quote:\n        ${lit(a.quote.quote)},\n    },`,
      );
    }
    if (a.why && !sub.has.whyLocal) {
      fields.push(`    whyLocal:\n      ${lit(a.why)},`);
    }
    if (a.problems.length && !sub.has.commonProblems) {
      fields.push(
        `    commonProblems: [\n${a.problems.map((p) => `      ${lit(p)},`).join("\n")}\n    ],`,
      );
    }
    if (a.estates && !sub.has.knownEstates) {
      fields.push(`    knownEstates:\n      ${lit(a.estates)},`);
    }
    if (!fields.length) continue;

    // Insert just inside the closing brace. Anchor on the newline that
    // precedes it, not on the brace itself, or the first field picks up
    // the closing brace's own indentation and lands two spaces deep.
    const closeAt = src.lastIndexOf("\n", sub.end - 2) + 1;
    src = src.slice(0, closeAt) + fields.join("\n") + "\n" + src.slice(closeAt);
    added += fields.length;
    touched.push(sub.slug);
  }

  if (!added) {
    console.log("Everything in that file was already on record. No changes made.");
    return;
  }

  writeFileSync(SUBURBS, src);
  console.log(`Added ${added} fields across ${touched.length} suburbs:`);
  console.log("  " + touched.reverse().join(", "));
  console.log("\nNow run:  npx tsc --noEmit && npm run build");
  if ([...answers.values()].some((a) => a.quote)) {
    console.log(
      "\nTestimonials went in. Check every one is a real customer who has\n" +
      "either left that review publicly or said yes to being quoted.",
    );
  }
}

/* ------------------------------------------------------------------ */

const [mode, arg] = process.argv.slice(2);
if (mode === "template") template(Number(arg) || 15);
else if (mode === "import" && arg) doImport(arg);
else {
  console.log("usage:");
  console.log("  node scripts/suburb-notes.mjs template [count]");
  console.log("  node scripts/suburb-notes.mjs import <file>");
  process.exit(1);
}
