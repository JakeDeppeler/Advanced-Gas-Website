"use client";

import { useEffect } from "react";
import { FSVC } from "@/lib/homepage/data";
import { sendIntent } from "@/lib/homepage/intent";

/**
 * Starts the hero quote form (HeroQuote) at a service, so the heat pump page's
 * form opens on the hot water types rather than asking what the job is. The
 * same request a service card makes on the homepage; the form keeps its Back
 * button, so the first question is still a tap away.
 *
 * `service` is the form's own label for it ("Cooling", "Hot water"), looked
 * up here so a reorder of the form's services can't point it at the wrong one.
 */
export function QuotePreset({ service }: { service: string }) {
  useEffect(() => {
    const i = FSVC.findIndex((s) => s.t === service);
    if (i >= 0) sendIntent({ kind: "quote", service: i });
  }, [service]);
  return null;
}
