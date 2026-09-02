"use client";

import { useState } from "react";

const money = (n: number) =>
  n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Price a job by the hours: workers × hours on the charge-out rate, plus
 * materials with a markup, GST on top. The charge-out rate is the number the
 * Overhead cost tool works out — the rate that clears overhead with a margin.
 */
export function JobCalculator() {
  const [workers, setWorkers] = useState(2);
  const [hours, setHours] = useState(6);
  const [rate, setRate] = useState(130);
  const [materials, setMaterials] = useState(0);
  const [markup, setMarkup] = useState(20);

  const workerHours = Math.max(0, workers) * Math.max(0, hours);
  const labour = workerHours * Math.max(0, rate);
  const materialsMarked = Math.max(0, materials) * (1 + Math.max(0, markup) / 100);
  const subtotal = labour + materialsMarked;
  const gst = subtotal * 0.1;
  const total = subtotal + gst;

  return (
    <div className="pt-calc">
      <div className="pt-calc__inputs">
        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">The job</h3>
          <p className="pt-calc__hint">How many are on the tools, and for how long.</p>
          <div className="pt-calc__row">
            <span>Workers on the job</span>
            <span className="pt-calc__field">
              <input type="number" min="0" step="1" value={workers} onChange={(e) => setWorkers(num(e.target.value))} />
            </span>
          </div>
          <div className="pt-calc__row">
            <span>Hours each</span>
            <span className="pt-calc__field">
              <input type="number" min="0" step="0.5" value={hours} onChange={(e) => setHours(num(e.target.value))} />
              <span className="pt-calc__post">hrs</span>
            </span>
          </div>
          <div className="pt-calc__subtotal">
            <span>Total worker-hours</span>
            <strong>{workerHours} hrs</strong>
          </div>
        </div>

        <div className="pt-calc__panel">
          <h3 className="pt-calc__h">Rate &amp; materials</h3>
          <p className="pt-calc__hint">The charge-out rate comes from the Overhead cost tool.</p>
          <div className="pt-calc__row">
            <span>Charge-out rate</span>
            <span className="pt-calc__field">
              <span className="pt-calc__pre">$</span>
              <input type="number" min="0" step="5" value={rate} onChange={(e) => setRate(num(e.target.value))} />
              <span className="pt-calc__post">/hr</span>
            </span>
          </div>
          <div className="pt-calc__row">
            <span>Materials (your cost)</span>
            <span className="pt-calc__field">
              <span className="pt-calc__pre">$</span>
              <input type="number" min="0" step="10" value={materials} onChange={(e) => setMaterials(num(e.target.value))} />
            </span>
          </div>
          <div className="pt-calc__row">
            <span>Materials markup</span>
            <span className="pt-calc__field">
              <input type="number" min="0" step="5" value={markup} onChange={(e) => setMarkup(num(e.target.value))} />
              <span className="pt-calc__post">%</span>
            </span>
          </div>
        </div>
      </div>

      <div className="pt-calc__result">
        <div className="pt-calc__result-lead">Price for this job (inc GST)</div>
        <div className="pt-calc__big">{money(total)}</div>
        <div className="pt-calc__breakdown">
          <div><span>Labour ({workerHours} hrs × {money(rate)})</span><strong>{money(labour)}</strong></div>
          <div><span>Materials + {markup}%</span><strong>{money(materialsMarked)}</strong></div>
          <div className="pt-calc__break-total"><span>Subtotal (ex GST)</span><strong>{money(subtotal)}</strong></div>
          <div><span>GST 10%</span><strong>{money(gst)}</strong></div>
        </div>
        <div className="pt-calc__charge">
          <span>All in, that&rsquo;s</span>
          <strong>{money(total)}</strong>
          <em>≈ {money(total / (workerHours || 1))}/worker-hour delivered</em>
        </div>
        <p className="pt-calc__note">A ballpark to price from — set the charge-out rate to whatever clears your overhead with the margin you want (work it out in the Overhead cost tool). Always confirm the final number on a written quote.</p>
      </div>
    </div>
  );
}
