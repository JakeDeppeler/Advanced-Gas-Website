/**
 * What the television shows before it has been paired.
 *
 * Two plain forms and no JavaScript, deliberately: this renders on whatever
 * browser is baked into a panel or a streaming stick, and those are the devices
 * least likely to cope with anything clever. A form post and a redirect work
 * everywhere.
 *
 * It does mean /tv now admits it exists, where before an unpaired visitor got a
 * 404. That is the trade for a screen somebody can set up without a laptop: it
 * is a sign-in page, it says nothing about the business, and the code behind it
 * is bounded four ways. The board itself is no easier to reach than it was.
 */
export function PairScreen({ sent, bad }: { sent: boolean; bad: boolean }) {
  return (
    <div className="pair">
      <div className="pair__card">
        <div className="pair__brand">Advanced Gas &amp; Aircon</div>
        <h1 className="pair__title">Pair this screen</h1>

        {bad ? (
          <p className="pair__msg pair__msg--bad">
            That code didn&rsquo;t work. It may have expired, or already been used — ask for another.
          </p>
        ) : sent ? (
          <p className="pair__msg pair__msg--ok">
            If that address is on the team, a code is on its way. It lasts fifteen minutes.
          </p>
        ) : (
          <p className="pair__msg">Enter your email to get a code, then type the code below.</p>
        )}

        <form className="pair__form" method="post" action="/api/screen/pair/request">
          <label className="pair__label" htmlFor="pair-email">
            Your email
          </label>
          <div className="pair__row">
            <input
              className="pair__input"
              id="pair-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@advancedgas.com.au"
              required
            />
            <button className="pair__btn pair__btn--ghost" type="submit">
              Send code
            </button>
          </div>
        </form>

        <form className="pair__form" method="post" action="/api/screen/pair">
          <label className="pair__label" htmlFor="pair-code">
            Code from the email
          </label>
          <div className="pair__row">
            {/* Upper-cased on the way in for looks only — the server strips case
                and punctuation, because a television keyboard is usually stuck
                in lower case and the code is printed with a dash in it. */}
            <input
              className="pair__input pair__input--code"
              id="pair-code"
              name="code"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="one-time-code"
              spellCheck={false}
              placeholder="K7M2-QX8P"
              required
            />
            <button className="pair__btn" type="submit">
              Pair
            </button>
          </div>
        </form>

        <p className="pair__foot">This screen stays signed in for a year once it&rsquo;s paired.</p>
      </div>
    </div>
  );
}
