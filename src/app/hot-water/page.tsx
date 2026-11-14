import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { seoMeta } from "@/lib/seo";
import { CATS } from "@/lib/homepage/data";
import { CategoryPage } from "@/components/homepage/page/CategoryPage";
import { CATEGORY_COPY } from "@/components/homepage/page/categoryCopy";
import "@/components/homepage/homepage.css";
import "@/components/homepage/product/product.css";
import "@/components/homepage/brand/brand.css";
import "@/components/homepage/page/kit.css";

const copy = CATEGORY_COPY.hw;

export const metadata: Metadata = seoMeta({ title: copy.title, description: copy.description, canonical: copy.path });

export default function Page() {
  const cat = CATS.find((c) => c.id === "hw");
  if (!cat) notFound();
  return <CategoryPage cat={cat} copy={copy} />;
}
