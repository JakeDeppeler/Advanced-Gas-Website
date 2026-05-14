import { NextResponse } from "next/server";
import { site } from "@/lib/site";

export const runtime = "nodejs";

type Signup = { email: string; hp?: string };

export async function POST(req: Request) {
  const data = (await req.json()) as Signup;

  if (data.hp && data.hp.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return new NextResponse("Invalid email", { status: 400 });
  }

  const recipients = (process.env.LEAD_NOTIFICATION_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const key = process.env.RESEND_API_KEY;

  if (recipients.length > 0 && key) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `Advanced Gas Website <${site.email}>`,
          to: recipients,
          subject: "Newsletter signup",
          text: `New newsletter signup: ${data.email}`,
        }),
      });
    } catch (e) {
      console.error("Failed to email newsletter signup", e);
    }
  } else {
    console.log("NEWSLETTER SIGNUP →", data.email);
  }

  return NextResponse.json({ ok: true });
}
