"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/**
 * Image that falls back to a second src when the primary fails to load.
 * Used across brand + product cards so we can point at the real
 * manufacturer photos in code before the .webp files are actually
 * saved to /public — while they're missing the fallback keeps the
 * cards visually intact.
 *
 * It renders `next/image` rather than a bare `<img>`. The fallback still
 * works: a file that isn't on disk fails at the optimiser, the browser
 * fires `error`, and we swap to the second source exactly as before —
 * the difference is that the ten photos this wraps, including a 1600px
 * hero on every brand page, now come back resized and in the format the
 * browser asked for.
 *
 * `encodeURI` because a handful of the product filenames have spaces in
 * them. A raw `<img>` tolerates that; the optimiser rejects the request
 * and the image silently stays full-size.
 */
export function SafeImg({
  src,
  fallback,
  alt,
  ...rest
}: { src: string; fallback?: string; alt: string } & Omit<ImageProps, "src" | "alt">) {
  const [current, setCurrent] = useState(src);
  return (
    <Image
      {...rest}
      src={encodeURI(current)}
      alt={alt}
      onError={() => {
        if (fallback && current !== fallback) setCurrent(fallback);
      }}
    />
  );
}
