import { getReviews } from "@/lib/googleReviews";

/**
 * The home page's scrolling review columns, extracted so other pages can
 * use them.
 *
 * Jake's note: the reviews on the category pages should be the moving
 * ones from the home screen, not the static strip. They were the same
 * markup living inline in page.tsx, so this is that markup lifted out —
 * three columns, each scrolling at a different speed, paused on hover.
 *
 * The animation and the mask live in home.css scoped to `.page-home`,
 * so the styles come across too (see filtration.css).
 */
export async function ReviewMarquee({
  eyebrow = "What locals say",
  heading = "Reviews from real Pakenham, Berwick & Officer households.",
}: {
  eyebrow?: string;
  heading?: string;
}) {
  const { reviews } = await getReviews(12);
  if (reviews.length === 0) return null;

  const columns = [
    reviews.filter((_, i) => i % 3 === 0),
    reviews.filter((_, i) => i % 3 === 1),
    reviews.filter((_, i) => i % 3 === 2),
  ];

  return (
    <section className="reviews revmarquee">
      <div className="wrap">
        <div className="reviews__head">
          <div>
            <span className="ds-eyebrow"><span className="ds-dot" /> {eyebrow}</span>
            <h2>{heading}</h2>
          </div>
          <div className="reviews__badge">
            <div className="reviews__badge-stars" aria-hidden="true">★ ★ ★ ★ ★</div>
            <div><strong>4.9 / 5</strong> on Google</div>
          </div>
        </div>

        <div className="reviews__marquee" aria-label="Recent Google reviews">
          {columns.map((col, ci) => (
            <div key={ci} className={`revcol revcol--${ci + 1}`}>
              <div className="revcol__track">
                {[...col, ...col].map((r, ri) => (
                  <article key={`${ci}-${ri}`} className="revcard">
                    <div className="revcard__stars">★★★★★</div>
                    <h3 className="revcard__title">{r.title}</h3>
                    <p className="revcard__txt">&ldquo;{r.txt}&rdquo;</p>
                    <div className="revcard__by">
                      <span className="revcard__avatar">{r.a}</span>
                      <div>
                        <strong>{r.who}</strong>
                        <span>{r.what}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
