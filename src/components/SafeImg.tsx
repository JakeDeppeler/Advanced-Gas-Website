"use client";

import { useState, type ImgHTMLAttributes } from "react";

/**
 * <img> that falls back to a second src when the primary fails to load.
 * Used across brand + product cards so we can point at the real
 * manufacturer photos in code before the .webp files are actually
 * saved to /public — while they're missing the fallback keeps the
 * cards visually intact.
 *
 * Once every photo file is on disk you can rip this out and use a
 * plain <img> again — the fallback prop is optional.
 */
export function SafeImg({
  src,
  fallback,
  alt,
  ...rest
}: { src: string; fallback?: string; alt: string } & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">) {
  const [current, setCurrent] = useState(src);
  return (
    <img
      {...rest}
      src={current}
      alt={alt}
      onError={() => {
        if (fallback && current !== fallback) setCurrent(fallback);
      }}
    />
  );
}
