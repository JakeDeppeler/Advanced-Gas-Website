export const metadata = { title: "Team portal — sign in" };

export default function PortalLogin({
  searchParams,
}: {
  searchParams: { sent?: string; error?: string; out?: string; next?: string };
}) {
  const sent = searchParams.sent === "1";
  const out = searchParams.out === "1";
  const expired = searchParams.error === "expired";

  return (
    <div className="pt-login">
      <div className="pt-login__card">
        <div className="pt-login__eyebrow">Advanced Gas · Team portal</div>
        <h1>Sign in</h1>
        <p>Enter your work email and we&rsquo;ll send you a one-time sign-in link — no password to remember.</p>

        {sent && (
          <div className="pt-login__msg pt-login__msg--ok">
            Check your email. If you&rsquo;re on the team, a sign-in link is on its way — it works once and expires in 15&nbsp;minutes.
          </div>
        )}
        {out && <div className="pt-login__msg pt-login__msg--ok">You&rsquo;re signed out.</div>}
        {expired && (
          <div className="pt-login__msg pt-login__msg--err">
            That link has expired or already been used. Request a fresh one below.
          </div>
        )}

        <form action="/api/portal/login" method="post">
          <label className="pt-login__label" htmlFor="email">Work email</label>
          <input
            className="pt-login__input"
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@advancedgas.com.au"
          />
          {searchParams.next ? <input type="hidden" name="next" value={searchParams.next} /> : null}
          <button className="pt-login__btn" type="submit">Email me a sign-in link →</button>
        </form>

        <p className="pt-login__fine"><a href="/">← Back to the main site</a></p>
      </div>
    </div>
  );
}
