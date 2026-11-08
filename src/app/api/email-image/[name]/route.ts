import { NextResponse } from "next/server";
import { readObject } from "@/lib/portal/storage";
import { EMAIL_IMAGES_BUCKET } from "@/lib/email/templates/store";

/**
 * A photo uploaded on Marketing › Customer emails, for Next's image optimiser
 * to shrink before it goes inside an email (templates/types.ts › photoUrl).
 *
 * Open, as the photos in an email have to be: the optimiser and the inline
 * step fetch it without a session. Only files from the email-images bucket,
 * named as the upload names them (a random id), so nothing else in storage
 * can be reached through it. A file never changes once uploaded, so it can
 * be cached for good.
 */
export const dynamic = "force-dynamic";

const NAME = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;
const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_req: Request, { params }: { params: { name: string } }) {
  const name = params.name;
  if (!NAME.test(name)) return new NextResponse("Not found", { status: 404 });
  const got = await readObject(name, EMAIL_IMAGES_BUCKET);
  if (!got.ok) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(Buffer.from(got.body), {
    headers: { "Content-Type": TYPES[name.split(".").pop() as string], "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
