import { COMM_RADAR } from "@/lib/commercialSite";
import { site } from "@/lib/site";

/**
 * Where the vans are, as a radius rather than a map.
 *
 * A map of Victoria answers "where is Pakenham", which nobody asks. The
 * question behind this section is "am I inside the range you'll come out
 * to", and a set of rings at 25, 50 and 75 km answers that at a glance —
 * with the towns placed at their true bearing so somebody who knows the
 * area can find themselves on it.
 *
 * 2.5px to the kilometre, so the rings at 62, 125 and 187 are the three
 * distances. The 75 km ring is orange because it is the one that matters:
 * inside it there is no travel loading.
 */

export function ServiceRadar() {
  return (
    <figure className="cx-rig cx-radar" style={{ margin: 0 }} aria-label="Service radius centred on Pakenham, rings at 25, 50 and 75 kilometres">
      <svg viewBox="0 0 520 420" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="cx-sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#00b0ed" stopOpacity="0" />
            <stop offset="1" stopColor="#00b0ed" stopOpacity=".35" />
          </linearGradient>
        </defs>

        <circle className="cx-rg" cx="260" cy="210" r="62" />
        <circle className="cx-rg" cx="260" cy="210" r="125" />
        <circle className="cx-rg" cx="260" cy="210" r="187" style={{ stroke: "rgba(243,103,34,.55)", strokeDasharray: "6 6" }} />
        <text x="266" y="152" opacity=".5">25 KM</text>
        <text x="266" y="89" opacity=".5">50 KM</text>
        <text x="266" y="27" style={{ fill: "var(--cx-orange)" }}>75 KM</text>

        <g className="cx-sweep">
          <path d="M260 210 L447 210 A187 187 0 0 0 392 78 Z" fill="url(#cx-sweep)" />
        </g>

        {COMM_RADAR.map((t) => (
          <g key={t.name}>
            <circle
              className={t.faint ? undefined : "cx-pt"}
              cx={t.x}
              cy={t.y}
              r="3"
              fill={t.faint ? "rgba(255,255,255,.4)" : undefined}
            />
            {t.ping !== undefined && (
              <circle className="cx-ping" cx={t.x} cy={t.y} r="4" style={{ ["--d" as string]: `${t.ping}s` }} />
            )}
            <text x={t.lx} y={t.ly} opacity={t.faint ? ".5" : undefined}>
              {t.name.toUpperCase()}
            </text>
          </g>
        ))}

        <circle cx="260" cy="210" r="7" fill="var(--cx-orange)" />
        <circle className="cx-ping" cx="260" cy="210" r="7" style={{ stroke: "var(--cx-orange)" }} />
        <text x="272" y="206" style={{ fontWeight: 600 }}>PAKENHAM</text>
      </svg>

      <figcaption className="cx-rig__cap">
        <div>
          <span className="cx-rig__eye">Base</span>
          <div>{site.address.street}, {site.address.suburb}</div>
        </div>
        <span className="cx-rig__live">Crews out today</span>
      </figcaption>
    </figure>
  );
}
