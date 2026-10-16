/**
 * Where a figure stands against both year goals — the $3.2M we're going for
 * and the $2.5M we can't go under — said as "▲ $3.2M · $1,200 over" or
 * "▼ $2.5M · $400 to go". `need` is what the main goal asks of this figure;
 * the floor asks the same share of its own year. Arrow, word and colour
 * together, so colour is never the only signal.
 */
type Levels = { goal: number; floor: number | null } | null | undefined;

const short = (n: number) => (n >= 1e6 ? `$${(Math.round(n / 1e5) / 10).toLocaleString("en-AU")}M` : `$${Math.round(n / 1e3)}k`);
const money = (n: number) => `$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;

export function TwoGoals({ levels, done, need }: { levels: Levels; done: number | null | undefined; need: number | null | undefined }) {
  if (!levels || done == null || need == null || !(need > 0)) return null;
  const marks = [{ year: levels.goal, need }];
  if (levels.floor && levels.floor > 0 && levels.floor < levels.goal) marks.push({ year: levels.floor, need: (need * levels.floor) / levels.goal });
  return (
    <span className="pk-goals">
      {marks.map((g) => {
        const ok = done >= g.need;
        return (
          <span key={g.year} className={ok ? "ok" : "no"}>
            {ok ? "▲" : "▼"} {short(g.year)} · {money(done - g.need)} {ok ? "over" : "to go"}
          </span>
        );
      })}
    </span>
  );
}
