/**
 * Which ServiceTitan name is this portal person.
 *
 * The two lists are typed by different people: on 12 October the portal had
 * "Dean Winbank" where ServiceTitan has "Dean Winbanks". Exact first, ignoring
 * case and spacing; then the same first name with one surname the start of the
 * other (four letters or more), and only when exactly one name fits that way —
 * two possible matches is no match, rather than a guess that pays someone
 * else's commission.
 */
export function matchName(portalName: string, names: string[]): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const me = norm(portalName);
  const exact = names.find((n) => norm(n) === me);
  if (exact) return exact;
  const [first, ...rest] = me.split(" ");
  const last = rest.join(" ");
  if (!first || last.length < 4) return null;
  const close = names.filter((n) => {
    const [f, ...r] = norm(n).split(" ");
    const l = r.join(" ");
    return f === first && l.length >= 4 && (l.startsWith(last) || last.startsWith(l));
  });
  return close.length === 1 ? close[0] : null;
}
