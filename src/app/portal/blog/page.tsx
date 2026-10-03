import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Heads } from "@/components/portal/marketingParts";
import { dbConfigured, listStoredPosts, pageViews } from "@/lib/portal/db";
import { isBuiltIn, isLive, mergePosts, postChecks } from "@/lib/blogMerge";
import { AUTHORS } from "@/lib/blog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog — Team portal" };

const WINDOW_DAYS = 30;

/** Melbourne's date a number of days back, the shape the views table keys on. */
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
const when = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

/**
 * Every article on the blog, with how many people read it and how ready it is
 * for Google — and an Edit on every one of them.
 *
 * Its own section now rather than a tab of Marketing: the blog is the one part
 * of the portal that writes to the public site, and it had grown its own
 * editor, its own figures and its own list.
 */
export default async function BlogPage() {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) redirect("/portal?denied=1");
  const canEdit = can(user, "manage_users");

  const ready = dbConfigured();
  const [stored, views] = await Promise.all([
    ready ? listStoredPosts().catch(() => []) : Promise.resolve([]),
    ready ? pageViews(daysAgo(WINDOW_DAYS - 1)).catch(() => null) : Promise.resolve(null),
  ]);
  const posts = mergePosts(stored, true);
  const rowOf = new Map(stored.map((r) => [r.slug, r]));

  const live = posts.filter((p) => { const r = rowOf.get(p.slug); return !r || isLive(r) || isBuiltIn(p.slug); });
  const drafts = stored.filter((r) => r.status === "draft" && !isBuiltIn(r.slug)).length;
  const blogViews = views
    ? [...views.byPath.entries()].filter(([path]) => path === "/blog" || path.startsWith("/blog/")).reduce((n, [, v]) => n + v, 0)
    : 0;
  const allFive = posts.filter((p) => postChecks(p).every((c) => c.ok)).length;
  // Nothing has been counted yet: every column of views would read 0, which
  // claims nobody read anything rather than that nobody was counting.
  const counting = Boolean(views?.since);

  return (
    <PortalShell user={user}>
      <div className="pt-head pt-head--split">
        <div>
          <PortalBack href="/portal" label="Home" />
          <h1>Blog</h1>
          <p>
            Every article on advancedgas.com.au/blog, newest first. Open any of them to edit it — including the ones written
            before the editor existed — and the change is on the site as soon as it&rsquo;s published.
          </p>
        </div>
        {canEdit && <Link href="/portal/blog/new" className="pt-btn pt-btn--orange pt-head__act">+ New post</Link>}
      </div>

      {!ready && (
        <div className="pt-note pt-note--warn"><strong>Database not connected.</strong> The list below is the articles in the code; nothing can be edited until it is.</div>
      )}

      <Heads
        items={[
          { label: "On the site", value: String(live.length), sub: "articles anyone can read", feature: true },
          {
            label: `Reads · ${WINDOW_DAYS} days`,
            value: counting ? blogViews.toLocaleString("en-AU") : "—",
            sub: counting ? `counted since ${when(views!.since!)}` : "counting starts with the next reader",
          },
          { label: "All five Google checks", value: `${allFive} of ${posts.length}`, sub: "open one to see what's missing" },
          { label: "Drafts", value: String(drafts), sub: drafts ? "not on the site yet" : "nothing waiting" },
        ]}
      />

      <section className="pt-panel">
        <div className="pt-fleet__wrap">
          <table className="pt-fleet pt-blogl">
            <thead>
              <tr>
                <th scope="col">Post</th>
                <th scope="col">Topic</th>
                <th scope="col">Status</th>
                <th scope="col" className="pt-blogl__num">Reads ({WINDOW_DAYS}d)</th>
                <th scope="col" className="pt-blogl__num">Google checks</th>
                <th scope="col"><span className="pt-sr">Edit</span></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p, i) => {
                const row = rowOf.get(p.slug);
                const builtIn = isBuiltIn(p.slug);
                const checks = postChecks(p);
                const passed = checks.filter((c) => c.ok).length;
                const n = views?.byPath.get(`/blog/${p.slug}`) ?? 0;
                // The state in words — whether the public can read it is the
                // question this column exists to answer.
                const status = !row
                  ? { label: "Published", tone: "ok", note: p.featured ? "top of the blog" : null }
                  : row.status === "draft"
                    ? builtIn
                      ? { label: "Published", tone: "ok", note: "edits in draft" }
                      : { label: "Draft", tone: "warn", note: null }
                    : isLive(row)
                      ? { label: "Published", tone: "ok", note: builtIn ? "edited here" : null }
                      : { label: "Scheduled", tone: "none", note: when(p.publishedISO) };
                return (
                  <tr key={p.slug}>
                    <th scope="row">
                      <div className="pt-blogl__post">
                        <Image src={p.photo} alt="" width={88} height={62} sizes="88px" className="pt-blogl__cover" />
                        <div>
                          <strong>{p.title}</strong>
                          <span>{i + 1} · {when(p.updatedISO ?? p.publishedISO)} · {AUTHORS[p.author]?.name.split(" ")[0] ?? "—"}</span>
                        </div>
                      </div>
                    </th>
                    <td>{p.cat}</td>
                    <td>
                      <span className={`pt-vstat pt-vstat--${status.tone}`}>{status.label}</span>
                      {status.note && <span className="pt-fleet__detail">{status.note}</span>}
                    </td>
                    <td className="pt-blogl__num"><strong>{counting ? n.toLocaleString("en-AU") : "—"}</strong></td>
                    <td className="pt-blogl__num" title={checks.filter((c) => !c.ok).map((c) => c.hint).join(" · ") || "All five pass"}>
                      <strong>{passed}/5</strong>
                      <span className="pt-fleet__detail">{passed === 5 ? "all pass" : checks.filter((c) => !c.ok).map((c) => c.fix).join(", ")}</span>
                    </td>
                    <td className="pt-fleet__go">
                      {canEdit
                        ? <Link href={`/portal/blog/${p.slug}`}>Edit →</Link>
                        : <a href={`/blog/${p.slug}`} target="_blank" rel="noopener">Read ↗</a>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {!counting && ready && (
        <div className="pt-note">
          <strong>Reads start counting from today.</strong> Until now nothing the portal can see recorded a page being
          read, so there are no figures to go back over — the column fills in as people open the posts.
        </div>
      )}
    </PortalShell>
  );
}
