/** Sends the portal sign-in link through Resend — the same REST endpoint
 *  the quote form already uses, so there's nothing new to configure beyond
 *  RESEND_API_KEY (and optionally RESEND_FROM_EMAIL). */

export async function sendMagicLink(to: string, link: string): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Advanced Gas Portal <onboarding@resend.dev>";
  if (!key) return { ok: false, error: "RESEND_API_KEY missing" };

  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f8;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
      <div style="background:#0e1b4d;border-radius:16px;padding:28px 28px 30px;color:#fff;">
        <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#f5a877;">Advanced Gas &amp; Aircon</div>
        <h1 style="font-size:22px;margin:8px 0 6px;color:#fff;">Team portal sign-in</h1>
        <p style="font-size:15px;line-height:1.55;color:#c6cdec;margin:0 0 22px;">Click below to sign in. The link works once and expires in 15&nbsp;minutes. If you didn't request it, you can ignore this email.</p>
        <a href="${link}" style="display:inline-block;background:#c2521a;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:12px;">Sign in to the portal →</a>
        <p style="font-size:12px;color:#8b93b8;margin:24px 0 0;word-break:break-all;">Or paste this link into your browser:<br>${link}</p>
      </div>
    </div>
  </body></html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Your Advanced Gas portal sign-in link",
        html,
      }),
    });
    if (!res.ok) return { ok: false, error: `${res.status} ${await res.text()}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}
