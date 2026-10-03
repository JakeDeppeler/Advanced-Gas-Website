import { NextResponse } from "next/server";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { signedUrls } from "@/lib/portal/storage";

export const dynamic = "force-dynamic";

/**
 * Hand out a brand-kit file, as a short-lived signed link.
 *
 * The bucket is private, so nothing is served straight off a public URL — this
 * checks the session, mints a link that expires, and redirects to it. A path
 * that isn't under `brand/` is refused outright: this route must not become a
 * way to read the van photos, which are a different thing behind a different
 * capability.
 */
export async function GET(req: Request) {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return new NextResponse("Not found", { status: 404 });

  const path = new URL(req.url).searchParams.get("path") ?? "";
  if (!path.startsWith("brand/") || path.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const urls = await signedUrls([path], 300);
  const url = urls.get(path);
  if (!url) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(url);
}
