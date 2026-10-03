import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Crawlers that run the page's scripts. They read every page, and are nobody. */
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|facebookexternalhit|whatsapp|vercel/i;

/**
 * One more read of a public page.
 *
 * Only in production: a preview deployment or a dev box loading pages would
 * otherwise add its own traffic to the figures the office reads. The path is
 * trimmed to a page address — no query string, which is where anything
 * personal would ride along.
 */
async function countView(url: string, key: string, raw: string | undefined, ua: string | null) {
  if (process.env.VERCEL_ENV !== "production") return;
  if (!ua || BOT.test(ua)) return;
  const path = (raw || "").split(/[?#]/)[0].slice(0, 200);
  if (!path.startsWith("/") || /^\/(portal|trade|screen|api)(\/|$)/.test(path)) return;
  await fetch(`${url}/rest/v1/rpc/portal_count_view`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_path: path }),
  });
}

/**
 * Records a phone tap as a lead, and counts page reads.
 *
 * Kept separate from the quote route because it carries nothing personal — the
 * page, where on it, and what brought them. A tap is not an enquiry we can ring
 * back; it is evidence that a page made someone pick up the phone, and until
 * now nothing counted them at all.
 */
export async function POST(req: Request) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: true });

  try {
    const body = (await req.json()) as { kind?: string; pagePath?: string; where?: string; utm?: Record<string, string> };
    if (body.kind === "view") {
      await countView(url, key, body.pagePath, req.headers.get("user-agent"));
      return NextResponse.json({ ok: true });
    }
    if (body.kind !== "call") return NextResponse.json({ ok: true });

    await fetch(`${url}/rest/v1/portal_leads`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        kind: "call",
        page_path: (body.pagePath || "").slice(0, 200) || null,
        source: (body.where || "").slice(0, 60) || null,
        utm: body.utm ?? {},
      }),
    });
  } catch (e) {
    // Never surface this. A missed tally is not worth an error on a page.
    console.error("track POST failed", e);
  }
  return NextResponse.json({ ok: true });
}
