import { notFound, permanentRedirect } from "next/navigation";
import { findProduct } from "@/lib/brands";
import { productPageFor } from "@/lib/homepage/data";

/**
 * The old model pages, one per catalogue model (around 85), now send people
 * to the product page that sells that model, with its size picked, or to the
 * brand page for a model no option uses. Jake's call (Nov 2026): one page
 * per option rather than a second, older page per size. The old layout is
 * in git history.
 *
 * Rendered on request so the redirect is a real 308 that search engines
 * follow, rather than a static page with a refresh in it.
 */
export const dynamic = "force-dynamic";

export default function ModelPage({ params }: { params: { brand: string; product: string } }) {
  const found = findProduct(params.brand, params.product);
  if (!found) notFound();
  permanentRedirect(productPageFor(params.brand, params.product) ?? `/brands/${params.brand}`);
}
