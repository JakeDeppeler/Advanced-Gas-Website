import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/portal/constants";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/portal/login";
  url.search = "?out=1";
  const res = NextResponse.redirect(url, { status: 303 });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
