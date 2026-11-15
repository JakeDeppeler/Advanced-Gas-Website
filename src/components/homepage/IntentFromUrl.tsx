"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { answersFrom, findSystem } from "@/lib/homepage/data";
import { sendIntent } from "@/lib/homepage/intent";

/**
 * `/?find=split-system&size=1#find` opens the finder at that system with
 * those answers; `/?book=split-system.premium&size=1#quote` fills the quote
 * form with that pick. These are what "Back to your options" and "Book this
 * install" on a /find product page link to, and what the header's product
 * cards link to from any other page.
 *
 * Rendered inside its own <Suspense>, so reading the query string doesn't
 * push the rest of the homepage out of the static render.
 */
export function IntentFromUrl() {
  const params = useSearchParams();
  const key = params.toString();

  useEffect(() => {
    const get = (k: string) => params.get(k);
    const book = get("book");
    if (book) {
      const [system, tier] = book.split(".");
      const ref = findSystem(system);
      if (ref && ref.sys.tiers.some((t) => t.slug === tier)) {
        const model = get("model") ?? undefined;
        sendIntent({ kind: "book", system, tier, answers: answersFrom(ref.sys, get), model }, "quote");
      }
      return;
    }
    const find = get("find");
    if (find) {
      const ref = findSystem(find);
      if (ref) sendIntent({ kind: "find", system: find, answers: answersFrom(ref.sys, get) }, "find");
      else if (["air", "hw", "heat"].includes(find)) sendIntent({ kind: "find", cat: find as "air" | "hw" | "heat" }, "find");
    }
    // `key` stands in for `params`, whose identity changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
