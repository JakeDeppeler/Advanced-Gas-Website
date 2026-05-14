"use client";

import Link from "next/link";
import { useState } from "react";
import type { BlogPost } from "@/lib/blogPosts";

type Props = {
  posts: BlogPost[];
  categories: string[];
  /** Hide this post from the grid only when "All" is selected (used for the featured card above). */
  hideOnAll?: string;
};

export function BlogFilterGrid({ posts, categories, hideOnAll }: Props) {
  const [active, setActive] = useState<string>("All");

  const filtered =
    active === "All"
      ? posts.filter((p) => p.slug !== hideOnAll)
      : posts.filter((p) => p.category === active);

  return (
    <>
      <div className="bl-cats">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActive(c)}
            className={`bl-cat${c === active ? " is-active" : ""}`}
            aria-pressed={c === active}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="bl-grid">
        {filtered.length === 0 ? (
          <p className="bl-grid__empty">No posts in this category yet — pick another tag above.</p>
        ) : (
          filtered.map((p, i) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className={`bl-card${i % 2 === 1 ? " bl-card--alt" : ""}`}
            >
              <div
                className="bl-card__photo"
                role="img"
                aria-label={p.photoAlt}
                style={{ backgroundImage: `url(${p.photo})` }}
              >
                <span className="bl-card__photo-tag">{p.category}</span>
              </div>
              <div className="bl-card__body">
                <span className="bl-card__meta">{p.readingMinutes} min · {p.date}</span>
                <h3>{p.title}</h3>
                <p>{p.excerpt}</p>
                <div className="bl-card__foot">
                  <span className="bl-card__read">Read article →</span>
                  <span>{p.categoryShort}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
