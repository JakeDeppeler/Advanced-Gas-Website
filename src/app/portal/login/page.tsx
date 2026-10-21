import { cookies } from "next/headers";
import { LOGIN_EMAIL_COOKIE } from "@/lib/portal/constants";

export const metadata = { title: "Team portal, sign in" };

/**
 * Sign in: navy on the left, the form on the right.
 *
 * Two steps, no password: the work email, then the six-digit code emailed to
 * it (see lib/portal/loginCode for why a code and not a link). The address
 * between the steps is in a cookie, not the URL.
 */
export default function PortalLogin({
  searchParams,
}: {
  searchParams: { step?: string; error?: string; out?: string; next?: string; again?: string };
}) {
  const asked = cookies().get(LOGIN_EMAIL_COOKIE)?.value ?? "";
  const codeStep = searchParams.step === "code" && !!asked;
  const out = searchParams.out === "1";
  const expired = searchParams.error === "expired";
  const wrong = searchParams.error === "wrong";
  const next = searchParams.next ? <input type="hidden" name="next" value={searchParams.next} /> : null;

  return (
    <div className="pt-login">
      <div className="pt-login__brandside">
        <div className="pt-login__mark">
          <strong>Advanced</strong>
          <em>Gas &amp; Aircon</em>
        </div>

        <div className="pt-login__pitch">
          <span className="pt-login__kicker">Team portal</span>
          <h2>
            One standard. Every job.
          </h2>
          <p>The handbook, processes, tools and numbers the crew works from, all in one place.</p>
        </div>

        <p className="pt-login__foot">(03) 5947 8000 · Pakenham</p>
      </div>

      <div className="pt-login__formside">
        {codeStep ? (
          <div className="pt-login__form">
            <h1>Check your email</h1>
            <p className="pt-login__lede">
              If <strong>{asked}</strong> is on the team, a six-digit code is on its way. It works once and expires in 10&nbsp;minutes.
            </p>
            {searchParams.again === "1" && !searchParams.error && <div className="pt-login__msg pt-login__msg--ok">A new code is on its way. Use the newest one.</div>}
            {wrong && <div className="pt-login__msg pt-login__msg--err">That code isn&rsquo;t right. Check the newest email and try again.</div>}
            {expired && <div className="pt-login__msg pt-login__msg--err">That code has run out or been used. Send a new one below.</div>}
            <form action="/api/portal/code" method="post">
              <div className="pt-login__field">
                <label className="pt-login__label" htmlFor="code">Sign-in code</label>
                <input
                  className="pt-login__input pt-login__code"
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9 ]{6,7}"
                  maxLength={7}
                  required
                  autoFocus
                  placeholder="123 456"
                />
              </div>
              {next}
              <button className="pt-login__btn" type="submit">Sign in</button>
            </form>
            <div className="pt-login__alt">
              <form action="/api/portal/login" method="post">
                {next}
                <button className="pt-login__link" type="submit">Send a new code</button>
              </form>
              <a className="pt-login__link" href={`/portal/login${searchParams.next ? `?next=${encodeURIComponent(searchParams.next)}` : ""}`}>Use a different email</a>
            </div>
          </div>
        ) : (
          <div className="pt-login__form">
            <h1>Sign in</h1>
            <p className="pt-login__lede">We&rsquo;ll email you a six-digit code. No password to remember.</p>

            {out && <div className="pt-login__msg pt-login__msg--ok">You&rsquo;re signed out.</div>}
            {expired && (
              <div className="pt-login__msg pt-login__msg--err">
                That sign-in has run out. Ask for a new code below.
              </div>
            )}

            <form action="/api/portal/login" method="post">
              <div className="pt-login__field">
              <label className="pt-login__label" htmlFor="email">Work email</label>
              <input
                className="pt-login__input"
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue={asked || undefined}
                placeholder="you@advancedgas.com.au"
              />
              </div>
              {next}
              <button className="pt-login__btn" type="submit">Email me a code</button>
              <a className="pt-login__fine" href="/">← Back to the main site</a>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
