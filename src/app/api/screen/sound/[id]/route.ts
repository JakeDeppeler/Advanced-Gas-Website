import { NextResponse } from "next/server";
import { screenTokenValid } from "@/lib/dashboard/screenAuth";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { fileById } from "@/lib/board/sounds";
import { readObject } from "@/lib/portal/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * An uploaded wall-board sound.
 *
 * The television asks with its screen token, the way it asks for everything;
 * the portal's Sounds page asks with the signed-in session so it can play one
 * before it's chosen. Served from here rather than a signed storage link,
 * because a board runs for weeks and a signed link expires in an hour.
 *
 * An uploaded file never changes — a new upload is a new id — so the board
 * may keep it as long as it likes.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const token = new URL(req.url).searchParams.get("k");
  let allowed = screenTokenValid(token);
  if (!allowed) {
    const user = await getPortalUser().catch(() => null);
    allowed = !!user && can(user, "overhead");
  }
  if (!allowed) return new NextResponse("Not found", { status: 404 });

  const f = /^[0-9a-f-]{36}$/i.test(params.id) ? await fileById(params.id).catch(() => null) : null;
  if (!f) return new NextResponse("Not found", { status: 404 });
  const obj = await readObject(f.path);
  if (!obj.ok) return new NextResponse("Not available", { status: obj.status === 404 ? 404 : 502 });
  return new NextResponse(obj.body, {
    headers: {
      "Content-Type": obj.type.startsWith("audio/") ? obj.type : "audio/mpeg",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
