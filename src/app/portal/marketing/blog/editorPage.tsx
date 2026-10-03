import { redirect } from "next/navigation";
import Link from "next/link";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { PostEditor, type PostDraft } from "@/components/portal/PostEditor";
import { AUTHORS } from "@/lib/blog";
import { dbConfigured, listStoredPosts } from "@/lib/portal/db";

/** Melbourne's today, which is the date a post written here should carry. */
const todayMel = () => new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });

const BLANK: PostDraft = {
  original: null, slug: "", title: "", seoTitle: "", blurb: "", cat: "Heat pumps",
  author: "dean", photo: "", photoAlt: "", body: "", featured: false, onHome: false,
  publishedOn: todayMel(), status: null,
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
    // A post that only exists in blog.ts has no row to edit. Saying so beats
    // silently opening an empty form that would create a second post at the
    // same address.
    if (!row) {
      return (
        <PortalShell user={user}>
          <div className="pt-head">
            <PortalBack href="/portal/marketing?tab=blog" label="Blog" />
            <h1>That post isn&rsquo;t editable here</h1>
            <p>
              It&rsquo;s one of the articles written in the codebase, where it was authored and where it is indexed.
              Nothing in the portal touches those.
            </p>
          </div>
          <div className="pt-note">
            <Link href={`/blog/${slug}`} target="_blank" rel="noopener">Read it on the site ↗</Link>
          </div>
        </PortalShell>
      );
    }
    initial = {
      original: row.slug, slug: row.slug, title: row.title, seoTitle: row.seoTitle ?? "",
      blurb: row.blurb, cat: row.cat, author: row.author, photo: row.photo ?? "",
      photoAlt: row.photoAlt, body: row.body, featured: row.featured, onHome: row.onHome,
      publishedOn: row.publishedOn ?? todayMel(), status: row.status,
    };
  }

  return (
    <PortalShell user={user}>
      <div className="pt-head pt-head--split">
        <div>
          <PortalBack href="/portal/marketing?tab=blog" label="Blog" />
          <h1>{slug ? "Edit the post" : "Write a post"}</h1>
          <p>Published posts go straight onto advancedgas.com.au/blog. Drafts stay here.</p>
        </div>
      </div>

      {!dbConfigured() ? (
        <div className="pt-note pt-note--warn">
          <strong>The database isn&rsquo;t connected.</strong> The blog still reads fine; nothing can be written to it
          from here until it is.
        </div>
      ) : (
        <PostEditor initial={initial} authors={authorOptions} />
      )}
    </PortalShell>
  );
}
