import Link from "next/link";
import { deliveryFor, suitsPeople, HW_DEFAULTS } from "@/lib/hotWater";

/**
 * "How much shower does this actually give you" panel for storage hot
 * water products.
 *
 * Buyers compare tanks by nameplate litres, which understates them —
 * stored water gets blended with cold on the way to the rose, so a 315 L
 * tank is more like 435 L of shower. This puts that in showers and
 * minutes, says who it suits, and hands off to the calculator for anyone
 * whose household doesn't match the assumptions.
 *
 * Renders nothing without a tank size, so continuous-flow units and
 * controllers skip it automatically.
 */
export function ShowerDelivery({
  tankLitres,
  compressorKw,
  productName,
}: {
  tankLitres?: number;
  /** Heat output. Decides how fast the tank comes back, so it belongs
   *  next to the volume rather than being left off the page. */
  compressorKw?: number;
  productName: string;
}) {
  if (!tankLitres) return null;

  const d = deliveryFor(tankLitres);
  const fit = suitsPeople(tankLitres);
  const n = (v: number, dp = 0) =>
    v.toLocaleString("en-AU", { minimumFractionDigits: dp, maximumFractionDigits: dp });

  return (
    <section className="swd">
      <div className="swd__head">
        <span className="ds-eyebrow"><span className="ds-dot ds-dot--orange" /> Hot water in the real world</span>
        <h2>What {tankLitres} L actually gets you.</h2>
      </div>

      <div className="swd__grid">
        <div className="swd__stat swd__stat--lead">
          <strong>{n(d.showers, 1)}</strong>
          <span>back-to-back showers</span>
          <em>{HW_DEFAULTS.showerMinutes} min each at {HW_DEFAULTS.showerFlowLpm} L/min</em>
        </div>
        <div className="swd__stat">
          <strong>{n(d.mixedLitres)} L</strong>
          <span>water at {HW_DEFAULTS.mixedTempC} °C</span>
          <em>{n(d.usableLitres)} L stored hot + {n(d.coldLitres)} L cold</em>
        </div>
        <div className="swd__stat">
          <strong>{n(d.showerMinutes)} min</strong>
          <span>of continuous shower</span>
          <em>before the heat pump puts anything back</em>
        </div>
        {compressorKw && (
          <div className="swd__stat">
            <strong>{compressorKw} kW</strong>
            <span>compressor</span>
            <em>
              puts back about{" "}
              {Math.round((compressorKw * 3600) / (4.186 * (HW_DEFAULTS.tankTempC - HW_DEFAULTS.mainsTempC)))} L an hour
            </em>
          </div>
        )}
        <div className="swd__stat swd__stat--fit">
          <strong>{fit.label}</strong>
          <span>comfortable household</span>
          <em>showers split morning and night</em>
        </div>
      </div>

      <p className="swd__note">
        A {tankLitres} L tank doesn&rsquo;t give you {tankLitres} L of shower. It gives up
        about {Math.round(100 * 0.8)}% of its volume before the outlet starts running
        cool, and that {HW_DEFAULTS.tankTempC} °C water gets blended with{" "}
        {HW_DEFAULTS.mainsTempC} °C mains down to a{" "}
        {HW_DEFAULTS.mixedTempC} °C shower, so it stretches further than the label
        suggests. Figures assume Melbourne winter mains; you&rsquo;ll get more in summer.
      </p>

      <div className="swd__cta">
        <Link href="/tools/heat-pump-sizing" className="ds-btn ds-btn--orange ds-btn--sm">
          Size it for your household →
        </Link>
        <span className="swd__cta-note">
          Different shower habits? The calculator works {productName} against your
          actual household and tells you whether it keeps up.
        </span>
      </div>
    </section>
  );
}
