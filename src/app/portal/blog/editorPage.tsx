import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { PostEditor, type PostDraft } from "@/components/portal/PostEditor";
import { AUTHORS } from "@/lib/blog";
import { POST_CATS, builtInPost, isBuiltIn, roundTrips, sectionsToBody } from "@/lib/blogMerge";
import { dbConfigured, listStoredPosts } from "@/lib/portal/db";

/** Melbourne's today, which is the date a post written here should carry. */
const todayMel = () => new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });

const BLANK: PostDraft = {
  original: null, slug: "", title: "", seoTitle: "", blurb: "", cat: "Heat pumps",
  author: "dean", photo: "", photoAlt: "", body: "", featured: false, onHome: false,
  publishedOn: todayMel(), status: null, builtIn: false, edited: false,
};

const authorOptions = Object.entries(AUTHORS).map(([k, a]) => ({ k, name: a.name, role: a.role }));

/**
 * The editor page, for a new post and for an existing one.
 *
 * One component rather than two pages that drift: the only difference is
 * whether there is a row to load.
 */
export async function BlogEditorPage({ slug }: { slug: string | null }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "manage_users")) redirect("/portal?denied=1");

  let initial = BLANK;
  if (slug) {
    const row = (dbConfigured() ? await listStoredPosts().catch(() => []) : []).find((p) => p.slug === slug);
    // A post that only exists in blog.ts has no row yet. It opens with its
    // own words in the box; saving writes a row over it by the same address,
    // and taking that row away puts the original back.
    if (!row) {
      const p = builtInPost(slug);
      if (!p) notFound();
      // Only offered when its text survives the editor exactly — otherwise the
      // first save would change parts of the live article nobody touched.
      if (!roundTrips(p.content)) {
        return (
          <PortalShell user={user}>
            <div className="pt-head">
              <PortalBack href="/portal/blog" label="Blog" />
              <h1>This one can&rsquo;t be opened here</h1>
              <p>
                Part of it is laid out in a way the editor can&rsquo;t write back exactly, so saving it would change the live
                article in places nobody touched. It stays as it is in the code.
              </p>
            </div>
            <div className="pt-note">
              <Link href={`/blog/${slug}`} target="_blank" rel="noopener">Read it on the site ↗</Link>
            </div>
          </PortalShell>
        );
      }
      initial = {
        original: p.slug, slug: p.slug, title: p.title, seoTitle: p.seoTitle ?? "",
        blurb: p.blurb, cat: p.cat, author: p.author, photo: p.photo, photoAlt: p.photoAlt,
        body: sectionsToBody(p.content), featured: Boolean(p.featured), onHome: Boolean(p.onHome),
        publishedOn: p.publishedISO, status: "published", builtIn: true, edited: false,
      };
    } else {
      initial = {
        original: row.slug, slug: row.slug, title: row.title, seoTitle: row.seoTitle ?? "",
        blurb: row.blurb, cat: row.cat, author: row.author, photo: row.photo ?? "",
        photoAlt: row.photoAlt, body: row.body, featured: row.featured, onHome: row.onHome,
        publishedOn: row.publishedOn ?? todayMel(), status: row.status,
        builtIn: isBuiltIn(row.slug), edited: true,
      };
    }
  }

  return (
    <PortalShell user={user}>
      <div className="pt-head pt-head--split">
        <div>
          <PortalBack href="/portal/blog" label="Blog" />
          <h1>{slug ? initial.title || "Edit the post" : "Write a post"}</h1>
          <p>Published posts go straight onto advancedgas.com.au/blog. Drafts stay here.</p>
        </div>
      </div>

      {!dbConfigured() ? (
        <div className="pt-note pt-note--warn">
          <strong>The database isn&rsquo;t connected.</strong> The blog still reads fine; nothing can be written to it
          from here until it is.
        </div>
      ) : (
        <PostEditor initial={initial} authors={authorOptions} cats={POST_CATS} />
      )}
    </PortalShell>
  );
}
