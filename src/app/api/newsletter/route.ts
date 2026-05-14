import { NextResponse } from "next/server";
import { Resend } from "resend";

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
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? `Advanced Gas Website <onboarding@resend.dev>`;

  if (apiKey && recipients.length > 0) {
    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from,
        to: recipients,
        subject: "Newsletter signup",
        text: `New newsletter signup: ${data.email}`,
      });
    } catch (e) {
      console.error("Failed to email newsletter signup", e);
    }
  } else {
    console.log("NEWSLETTER SIGNUP →", data.email);
  }

  return NextResponse.json({ ok: true });
}
