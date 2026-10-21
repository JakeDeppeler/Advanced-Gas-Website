/** Sends the portal sign-in code through Resend — the same REST endpoint
 *  the quote form already uses. The code is the subject as well as the body,
 *  so it can be read off the notification without opening the email. */
export async function sendLoginCode(to: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Advanced Gas Portal <onboarding@resend.dev>";
  if (!key) return { ok: false, error: "RESEND_API_KEY missing" };

  const shown = `${code.slice(0, 3)} ${code.slice(3)}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f8;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
      <div style="background:#0e1b4d;border-radius:16px;padding:28px 28px 30px;color:#fff;">
        <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#f5a877;">Advanced Gas &amp; Aircon</div>
        <h1 style="font-size:22px;margin:8px 0 6px;color:#fff;">Your sign-in code</h1>
        <p style="font-size:15px;line-height:1.55;color:#c6cdec;margin:0 0 20px;">Type this on the portal&rsquo;s sign-in page. It works once and expires in 10&nbsp;minutes.</p>
        <div style="background:#fff;border-radius:12px;padding:18px 20px;text-align:center;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:700;letter-spacing:.12em;color:#0e1b4d;">${shown}</div>
        </div>
        <p style="font-size:13px;line-height:1.55;color:#8b93b8;margin:20px 0 0;">If you didn&rsquo;t ask to sign in, ignore this. Don&rsquo;t pass the code on: nobody at Advanced Gas will ever ask you for it.</p>
      </div>
    </div>
  </body></html>`;
  const text = `Your Advanced Gas portal sign-in code: ${code}\n\nType it on the sign-in page. It works once and expires in 10 minutes. If you didn't ask to sign in, ignore this.`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: `${code} is your Advanced Gas portal code`, html, text }),
    });
    if (!res.ok) return { ok: false, error: `${res.status} ${await res.text()}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

/**
 * The code that pairs a television with the wall board.
 *
 * A code rather than a link, because the screen it is for has no email on it:
 * whoever asks reads this off their phone and types it into the box on /tv.
 * So the code is the whole email — set big, monospaced, and with the dash we
 * print on the portal, because it gets copied by eye across a room.
 */
export async function sendPairingCode(to: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Advanced Gas Portal <onboarding@resend.dev>";
  if (!key) return { ok: false, error: "RESEND_API_KEY missing" };

  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f8;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
      <div style="background:#0e1b4d;border-radius:16px;padding:28px 28px 30px;color:#fff;">
        <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#f5a877;">Advanced Gas &amp; Aircon</div>
        <h1 style="font-size:22px;margin:8px 0 6px;color:#fff;">Pair the wall board</h1>
        <p style="font-size:15px;line-height:1.55;color:#c6cdec;margin:0 0 20px;">Type this on the television. It works once and expires in 15&nbsp;minutes.</p>
        <div style="background:#fff;border-radius:12px;padding:18px 20px;text-align:center;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;letter-spacing:.08em;color:#0e1b4d;">${code}</div>
        </div>
        <p style="font-size:13px;line-height:1.55;color:#8b93b8;margin:20px 0 0;">On the television, go to <strong style="color:#c6cdec;">advancedgas.com.au/tv</strong> and enter the code. If you didn't ask for this, ignore it, the code is useless without the screen.</p>
      </div>
    </div>
  </body></html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: `Wall board code: ${code}`, html }),
    });
    if (!res.ok) return { ok: false, error: `${res.status} ${await res.text()}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}
