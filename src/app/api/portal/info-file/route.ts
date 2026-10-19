import { NextResponse } from "next/server";
import { getPortalUser } from "@/lib/portal/session";
import { signedUrls } from "@/lib/portal/storage";
import { infoFiles } from "@/lib/portal/info/files";

export const dynamic = "force-dynamic";

/**
 * A document from an Information page, for anyone signed in to the portal:
 * whoever's asked for the certificate of currency can open it from the page.
 * Looked up by its id on the page, never by a path from the address bar, and
 * handed out as a link that expires in five minutes.
 */
export async function GET(req: Request) {
  const me = await getPortalUser();
  if (!me) return new NextResponse("Not found", { status: 404 });
  const q = new URL(req.url).searchParams;
  const f = (await infoFiles(q.get("slug") ?? "")).find((x) => x.id === q.get("id"));
  if (!f || !f.path.startsWith("info/")) return new NextResponse("Not found", { status: 404 });
  const url = (await signedUrls([f.path], 300)).get(f.path);
  if (!url) return new NextResponse("Not found", { status: 404 });
  // ?dl=1 saves it under its name rather than opening it in the browser.
  const name = `${f.label}.${f.path.split(".").pop()}`.replace(/[\\/:*?"<>|]/g, "-");
  return NextResponse.redirect(q.get("dl") ? `${url}${url.includes("?") ? "&" : "?"}download=${encodeURIComponent(name)}` : url);
}
