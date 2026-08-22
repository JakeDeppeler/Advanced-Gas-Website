import Link from "next/link";
import { TEAM, CREDENTIALS, STANDARDS } from "@/lib/company";

/**
 * "Who you'd actually be dealing with."
 *
 * Goes on every page where somebody might be deciding whether to ring
 * us. The pages were all answering "do you do this thing" and stopping,
 * but the person reading is deciding whether to let four strangers into
 * the house for a day and hand them a few thousand dollars. A spec sheet
 * doesn't help with that; faces, licence numbers and a checkable
 * standard do.
 *
 * `subject` just makes the heading read naturally per page — the content
 * underneath is the company, and the company doesn't change by page.
 */
export function CompanyTrust({
  subject = "the job",
  compact = false,
}: {
  subject?: string;
  compact?: boolean;
}) {
  return (
    <section className={`cotrust${compact ? " cotrust--compact" : ""}`}>
      <div className="wrap">
        <div className="ds-section-head ds-section-head--hl">
          <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Who you&rsquo;d be dealing with</span>
          <h2>Four people, one standard, and a licence number you can check.</h2>
          <p>
            Choosing who does {subject} is mostly a question about trust, and nothing on a
            specification sheet answers it. So here&rsquo;s who turns up, what the work is held
            to, and the credentials in full.
          </p>
        </div>

        {/* The people. Real photos, real roles. */}
        <div className="cotrust__team">
          {TEAM.map((m) => (
            <article className="cotrust__person" key={m.name}>
              <div className="cotrust__avatar">
                <img src={m.photo} alt={`${m.name}, ${m.role}`} loading="lazy" width="300" height="300" />
              </div>
              <h3>{m.name}</h3>
              <span className="cotrust__role">{m.role}</span>
              <p>{m.line}</p>
            </article>
          ))}
        </div>

        {!compact && (
          <>
            {/* The standard, stated concretely enough to be held to. */}
            <div className="cotrust__standards">
              <h3 className="cotrust__subhead">What &ldquo;done properly&rdquo; means here</h3>
              <div className="cotrust__stdgrid">
                {STANDARDS.map((s) => (
                  <div className="cotrust__std" key={s.t}>
                    <h4>{s.t}</h4>
                    <p>{s.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Credentials. Listed because they're checkable, which is the point. */}
        <div className="cotrust__creds">
          {CREDENTIALS.map((c) => (
            <div className="cotrust__cred" key={c.label}>
              <span className="cotrust__credlbl">{c.label}</span>
              <strong>{c.value}</strong>
              <span className="cotrust__crednote">{c.note}</span>
            </div>
          ))}
        </div>

        <p className="cotrust__more">
          <Link href="/about">More about the team and how we got here →</Link>
        </p>
      </div>
    </section>
  );
}
