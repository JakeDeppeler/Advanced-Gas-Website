import { NextResponse } from "next/server";
import { stDownload, stTenantPath } from "@/lib/dashboard/servicetitan";
import { photoSigOk } from "@/lib/email/jobPhoto";

/**
 * One job photo from ServiceTitan, for Next's image optimiser to shrink before
 * it goes inside a customer email (lib/email/jobPhoto.ts). Signed ids only.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const sig = new URL(req.url).searchParams.get("s") ?? "";
  if (!Number.isInteger(id) || id <= 0 || !photoSigOk(id, sig)) return new NextResponse("Not found", { status: 404 });
  try {
    const { bytes } = await stDownload(stTenantPath("forms", `jobs/attachment/${id}`), 20 * 1048576);
    // ServiceTitan often says application/octet-stream: go by the file's first bytes.
    const mime = bytes[0] === 0xff && bytes[1] === 0xd8 ? "image/jpeg" : bytes[0] === 0x89 && bytes[1] === 0x50 ? "image/png" : null;
    if (!mime) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": mime, "Cache-Control": "public, max-age=3600" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
