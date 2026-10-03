"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePost, unpublishPost, uploadCoverPhoto } from "@/app/portal/blog/actions";
import { bodySections, postChecks, toSlug } from "@/lib/blogText";
import { readingMinutes } from "@/lib/portal/prose";

export type AuthorOption = { k: string; name: string; role: string };

export type PostDraft = {
  original: string | null;
  slug: string;
  title: string;
  seoTitle: string;
  blurb: string;
  cat: string;
  author: string;
  photo: string;
  photoAlt: string;
  body: string;
  featured: boolean;
  onHome: boolean;
  publishedOn: string;
  status: "draft" | "published" | null;
  /** One of the articles written in blog.ts. */
  builtIn: boolean;
  /** Has a row in the portal — for a built-in article, has been edited here. */
  edited: boolean;
};

/** Google truncates around here. Not a limit, a budget. */
const DESC_BUDGET = 160;

/**
 * Writing a post, and putting it on the public site.
 *
 * The body is the same markdown-lite the handbook uses — blank line splits a
 * paragraph, "## " is a heading, "- " is a bullet — parsed by the same
 * function the public page renders through, so the preview below the box and
 * the published article cannot disagree. A rich-text editor would mean a
 * schema, a sanitiser, and a second renderer to keep in step with the first.
 *
 * Publish is a separate press from Save, and the page says plainly which
 * state it is in: everything else in this portal is read by the crew, and
 * this one is read by anyone.
 */
export function PostEditor({ initial, authors, cats }: { initial: PostDraft; authors: AuthorOption[]; cats: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [d, setD] = useState<PostDraft>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof PostDraft>(k: K, v: PostDraft[K]) => { setD((p) => ({ ...p, [k]: v })); setMsg(null); };

  const slug = d.slug || toSlug(d.title);
  const preview = bodySections(d.body);
  const checks = postChecks({ ...d, content: preview });
  const passed = checks.filter((c) => c.ok).length;

  const save = (publish: boolean) =>
    start(async () => {
      const res = await savePost({ ...d, slug, publish });
      if (!res.ok) return setMsg({ ok: false, text: res.error ?? "Couldn't save." });
      setD((p) => ({ ...p, original: res.slug ?? slug, slug: res.slug ?? slug, status: publish ? "published" : "draft", edited: true }));
      setMsg({
        ok: true,
        text: publish ? "Published. It's on the site now."
          : d.builtIn ? "Saved as a draft. The original is still the one on the site." : "Saved as a draft.",
      });
      router.refresh();
      if (!initial.original) router.replace(`/portal/blog/${res.slug}`);
    });

  const pickPhoto = (file: File) =>
    start(async () => {
      const form = new FormData();
      form.set("file", file);
      form.set("slug", slug || "post");
      const res = await uploadCoverPhoto(form);
      if (!res.ok || !res.url) return setMsg({ ok: false, text: res.error ?? "Couldn't upload it." });
      setD((p) => ({ ...p, photo: res.url! }));
      setMsg({ ok: true, text: "Cover photo added. Describe it below." });
    });

  return (
    <div className="pt-pe">
      <div className="pt-panel pt-pe__main">
        {/* Cover photo */}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="pt-pe__file"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) pickPhoto(f); e.target.value = ""; }}
        />
        {d.photo ? (
          <div className="pt-pe__cover">
            {/* eslint-disable-next-line @next/next/no-img-element -- a Supabase public URL, not a build-time asset. */}
            <img src={d.photo} alt={d.photoAlt || "Cover photo"} />
            <div className="pt-pe__coveracts">
              <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => fileRef.current?.click()}>Replace</button>
              <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" onClick={() => set("photo", "")}>Remove</button>
            </div>
          </div>
        ) : (
          <button type="button" className="pt-pe__drop" onClick={() => fileRef.current?.click()} disabled={pending}>
            {pending ? "Uploading…" : "+ Add a cover photo"}
          </button>
        )}
        {d.photo && (
          <label className="pt-field" style={{ marginTop: 12 }}>
            <span>What the photo shows <em>— read out to anyone using a screen reader</em></span>
            <input value={d.photoAlt} onChange={(e) => set("photoAlt", e.target.value)} placeholder="Heat pump hot water unit against a brick wall" />
          </label>
        )}

        <label className="pt-field pt-pe__title" style={{ marginTop: 18 }}>
          <span>Title</span>
          <input
            value={d.title}
            onChange={(e) => {
              set("title", e.target.value);
              if (!slugTouched) setD((p) => ({ ...p, title: e.target.value, slug: toSlug(e.target.value) }));
            }}
            placeholder="Heat pump vs gas hot water: what it costs to run"
          />
        </label>

        <div className="pt-pe__howto">
          Blank line starts a paragraph. <code>## </code> makes a heading. <code>- </code> makes a bullet.
        </div>
        <textarea
          className="pf-textarea pt-pe__body"
          rows={18}
          value={d.body}
          onChange={(e) => set("body", e.target.value)}
          placeholder={"The question the customer is actually asking.\n\n## What it costs\n\nUse the running-cost tool's numbers and the VEU rebate where it applies.\n\n- One point\n- Another point"}
        />
        <p className="pt-pe__count">
          {readingMinutes(d.body)} min read · {preview.length} block{preview.length === 1 ? "" : "s"}
        </p>

        {preview.length > 0 && (
          <details className="pt-pe__prev">
            <summary>How it will read</summary>
            <div className="pt-pe__prevbody">
              {preview.map((b, i) =>
                b.type === "h2" ? <h3 key={i}>{b.text}</h3>
                  : b.type === "ul" ? <ul key={i}>{b.items.map((x) => <li key={x}>{x}</li>)}</ul>
                    : <p key={i}>{b.text}</p>,
              )}
            </div>
          </details>
        )}
      </div>

      <div className="pt-pe__side">
        <section className="pt-panel">
          <h2 className="pt-panel__h">Publish</h2>
          {/* The state in words, because this is the one editor in the portal
              whose output anyone on the internet can read. */}
          <p className={`pt-pe__state${d.status === "published" || d.builtIn ? " is-live" : ""}`}>
            {d.builtIn && !d.edited
              ? "On the site, as first written. Publishing puts your version in its place."
              : d.builtIn && d.status === "draft"
                ? "Your edits are a draft. The original is still the one on the site."
                : d.status === "published"
                  ? d.builtIn ? "On the site, with your edits. Anyone can read it." : "On the site. Anyone can read it."
                  : d.status === "draft"
                    ? "Draft. Nobody outside the portal can see it."
                    : "Not saved yet."}
          </p>

          <label className="pt-field"><span>Topic</span>
            <select value={d.cat} onChange={(e) => set("cat", e.target.value)}>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="pt-field" style={{ marginTop: 12 }}><span>Author</span>
            <select value={d.author} onChange={(e) => set("author", e.target.value)}>
              {authors.map((a) => <option key={a.k} value={a.k}>{a.name} — {a.role}</option>)}
            </select>
          </label>
          <label className="pt-field" style={{ marginTop: 12 }}>
            <span>Publish on <em>— a date ahead keeps it off the site until then</em></span>
            <input type="date" value={d.publishedOn} onChange={(e) => set("publishedOn", e.target.value)} />
          </label>

          <div className="pt-pe__switches">
            <label className={`pt-switch${d.featured ? " is-on" : ""}`}>
              <input type="checkbox" checked={d.featured} onChange={(e) => set("featured", e.target.checked)} />
              <span className="pt-switch__track" aria-hidden="true"><span className="pt-switch__thumb" /></span>
              <span className="pt-switch__label">Top of the blog</span>
            </label>
            <label className={`pt-switch${d.onHome ? " is-on" : ""}`}>
              <input type="checkbox" checked={d.onHome} onChange={(e) => set("onHome", e.target.checked)} />
              <span className="pt-switch__track" aria-hidden="true"><span className="pt-switch__thumb" /></span>
              <span className="pt-switch__label">Show on the home page</span>
            </label>
          </div>

          <div className="pt-pe__acts">
            <button type="button" className="pt-btn pt-btn--ghost pt-btn--sm" disabled={pending} onClick={() => save(false)}>
              {pending ? "Saving…" : "Save draft"}
            </button>
            <button type="button" className="pt-btn pt-btn--orange pt-btn--sm" disabled={pending} onClick={() => save(true)}>
              {d.status === "published" ? "Update the live post" : "Publish"}
            </button>
          </div>
          {msg && <p className={`pt-inline ${msg.ok ? "is-ok" : "is-err"}`} style={{ marginTop: 12 }}>{msg.text}</p>}
          {(d.status === "published" || d.builtIn) && (
            <p className="pt-pe__viewrow">
              <a href={`/blog/${slug}`} target="_blank" rel="noopener" className="pt-pe__view">Read it on the site ↗</a>
            </p>
          )}
          {d.original && d.edited && (
            <button
              type="button"
              className="pt-btn pt-btn--danger pt-btn--sm pt-pe__kill"
              disabled={pending}
              onClick={() => start(async () => {
                const res = await unpublishPost(d.original!);
                if (!res.ok) return setMsg({ ok: false, text: res.error ?? "Couldn't remove it." });
                router.push("/portal/blog");
              })}
            >
              {/* A built-in article can't be taken off the site from here —
                  only the edits can be taken away, which puts it back as it
                  was first written. */}
              {d.builtIn ? "Undo my edits — put the original back" : d.status === "published" ? "Take it off the site" : "Delete this draft"}
            </button>
          )}
        </section>

        <section className="pt-panel">
          <h2 className="pt-panel__h">Google listing</h2>
          <p className="pt-panel__sub">What somebody sees before they decide whether to click.</p>
          <label className="pt-field"><span>Web address{d.builtIn && <em> — fixed: Google and every link to it already use this one</em>}</span>
            <input
              value={slug}
              readOnly={d.builtIn}
              onChange={(e) => { setSlugTouched(true); set("slug", toSlug(e.target.value)); }}
              placeholder="heat-pump-vs-gas-running-costs"
            />
          </label>
          <p className="pt-pe__url">advancedgas.com.au/blog/{slug || "…"}</p>

          <label className="pt-field" style={{ marginTop: 12 }}><span>Headline on Google <em>— leave blank to use the title</em></span>
            <input value={d.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} placeholder={d.title || "Shorter than the title, if the title is long"} />
          </label>

          <label className="pt-field" style={{ marginTop: 12 }}>
            <span>
              Description
              {/* Said as a count, not a hard stop: a good 160-character line
                  beats a truncated 150-character one. */}
              <em className={d.blurb.length > DESC_BUDGET ? " is-over" : ""}>
                {" "}— {d.blurb.length} / {DESC_BUDGET}{d.blurb.length > DESC_BUDGET ? ", Google will cut it" : ""}
              </em>
            </span>
            <textarea className="pf-textarea" rows={3} value={d.blurb} onChange={(e) => set("blurb", e.target.value)} placeholder="What shows under the title on Google, and on the blog card." />
          </label>
        </section>

        <section className="pt-panel">
          <h2 className="pt-panel__h">Google checks · {passed} of {checks.length}</h2>
          <p className="pt-panel__sub">Five things that decide how it shows up in a search. Not a ranking — nothing here knows what people search for.</p>
          <ul className="pt-pe__checks">
            {checks.map((c) => (
              // A tick or a cross in words as well as the mark, so the state
              // never rides on the colour alone.
              <li key={c.k} className={c.ok ? "is-ok" : "is-no"}>
                <span aria-hidden="true">{c.ok ? "✓" : "✕"}</span>
                <span>
                  <strong>{c.label}</strong>
                  <em>{c.ok ? "Done" : c.hint}</em>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
