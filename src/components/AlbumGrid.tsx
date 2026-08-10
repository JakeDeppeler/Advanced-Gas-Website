"use client";

import { useMemo, useState } from "react";
import { Lightbox } from "@/components/Lightbox";
import { albumCover, type Album } from "@/lib/albums";

/**
 * Grid of job albums with a brand filter and a click-through viewer.
 *
 * A one-photo job renders as a plain tile; anything with more shows a
 * count badge so it's obvious there's more behind it. Video tiles get a
 * play marker over the poster frame.
 */
export function AlbumGrid({
  albums,
  brandLabels = {},
  showFilter = true,
}: {
  albums: Album[];
  /** slug → display name, so the chips read "Mitsubishi Electric". */
  brandLabels?: Record<string, string>;
  showFilter?: boolean;
}) {
  const [brand, setBrand] = useState<string>("all");
  const [open, setOpen] = useState<{ album: Album; index: number } | null>(null);

  const brands = useMemo(
    () => [...new Set(albums.map((a) => a.brand).filter(Boolean) as string[])].sort(),
    [albums],
  );

  const shown = useMemo(
    () => (brand === "all" ? albums : albums.filter((a) => a.brand === brand)),
    [albums, brand],
  );

  if (albums.length === 0) return null;

  return (
    <>
      {showFilter && brands.length > 1 && (
        <div className="albums__filter" role="group" aria-label="Filter by brand">
          <button
            type="button"
            className={`albums__chip${brand === "all" ? " is-active" : ""}`}
            onClick={() => setBrand("all")}
            aria-pressed={brand === "all"}
          >
            All jobs
          </button>
          {brands.map((b) => (
            <button
              key={b}
              type="button"
              className={`albums__chip${brand === b ? " is-active" : ""}`}
              onClick={() => setBrand(b)}
              aria-pressed={brand === b}
            >
              {brandLabels[b] ?? b}
            </button>
          ))}
        </div>
      )}

      <div className="albums__grid">
        {shown.map((album) => {
          const cover = albumCover(album);
          const videos = album.items.filter((i) => i.type === "video").length;
          if (!cover) return null;
          return (
            <button
              key={album.slug}
              type="button"
              className="albums__tile"
              onClick={() => setOpen({ album, index: 0 })}
            >
              <span className="albums__pic">
                <img
                  src={cover.type === "video" ? (cover.poster ?? cover.src) : cover.src}
                  alt={cover.alt}
                  loading="lazy"
                  width="600"
                  height="450"
                />
                {album.items.length > 1 && (
                  <span className="albums__badge">{album.items.length} photos</span>
                )}
                {videos > 0 && (
                  <span className="albums__play" aria-hidden="true">▶</span>
                )}
              </span>
              <span className="albums__meta">
                <strong>{album.title}</strong>
                {album.suburb && <em>{album.suburb}</em>}
              </span>
            </button>
          );
        })}
      </div>

      {open && (
        <Lightbox
          album={open.album}
          startAt={open.index}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
