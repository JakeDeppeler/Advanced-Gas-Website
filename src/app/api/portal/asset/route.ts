import { NextResponse } from "next/server";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { signedUrls } from "@/lib/portal/storage";

export const dynamic = "force-dynamic";

/**
 * Hand out a library file (the brand kit, or Team › Resources), as a short-lived signed link.
 *
 * The bucket is private, so nothing is served straight off a public URL — this
 * checks the session, mints a link that expires, and redirects to it. A path
 * that isn't under `brand/` or `resources/` is refused outright: this route must not become a
 * way to read the van photos, which are a different thing behind a different
 * capability.
 */
export async function GET(req: Request) {
  const me = await getPortalUser();
  if (!me) return new NextResponse("Not found", { status: 404 });

  // Team › Resources (price lists, tech sheets, manuals) is for everyone,
  // crew included: they're the ones on site needing the manual. The
  // marketing kit stays the office's.
  const path = new URL(req.url).searchParams.get("path") ?? "";
  const ok = path.startsWith("resources/") || (path.startsWith("brand/") && can(me, "overhead"));
  if (!ok || path.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }

  // The files library has its own bucket (0103).
  const urls = await signedUrls([path], 300, "library");
  const url = urls.get(path);
  if (!url) return new NextResponse("Not found", { status: 404 });
  // ?dl=Name saves the file under that name instead of opening it in the browser.
  const dl = new URL(req.url).searchParams.get("dl");
  return NextResponse.redirect(dl ? `${url}${url.includes("?") ? "&" : "?"}download=${encodeURIComponent(dl.slice(0, 120))}` : url);
}
