/**
 * The photos an email can use without uploading one: our own installs and
 * the products we push, all JPGs in public/email sized for email. Not the
 * Thermann (we don't push it), the logo, or the headshots (those go in the
 * signature by themselves).
 *
 * `tall`: shown narrower in an email so the whole unit fits on a screen.
 * `small`: a product shot meant for photos side by side.
 */
export type EmailPhoto = { src: string; label: string; alt: string; tall?: boolean; small?: boolean };

export const EMAIL_PHOTOS: EmailPhoto[] = [
  { src: "/email/hp-aio.jpg", label: "Reclaim all-in-one, installed", alt: "A Reclaim all-in-one heat pump we installed on a slab beside the house", tall: true },
  { src: "/email/hp-split-full.jpg", label: "Reclaim CO₂ split, installed", alt: "A Reclaim CO₂ split we installed, tank and heat pump side by side", tall: true },
  { src: "/email/hp-close.jpg", label: "Heat pump close up", alt: "A heat pump hot water system we installed" },
  { src: "/email/hero-heat-pump.jpg", label: "Heat pump hot water", alt: "A heat pump hot water system we installed" },
  { src: "/email/hero-split.jpg", label: "Split system in a bedroom", alt: "A wall split system we installed in a bedroom" },
  { src: "/email/split-indoor.jpg", label: "Split system, indoor unit", alt: "The indoor unit of a split system we installed" },
  { src: "/email/split-roof.jpg", label: "Outdoor unit on a roof bracket", alt: "An outdoor unit we mounted on a roof bracket" },
  { src: "/email/hero-ducted.jpg", label: "Ducted", alt: "A ducted system we installed" },
  { src: "/email/hero-team.jpg", label: "The team and the vans", alt: "The Advanced Gas team with the vans outside our Pakenham workshop" },
  { src: "/email/opt-reclaim-aio.jpg", label: "Reclaim R290 300 L", alt: "A Reclaim all-in-one heat pump we installed", small: true },
  { src: "/email/opt-reclaim.jpg", label: "Reclaim CO₂ split", alt: "A Reclaim CO₂ split we installed, tank and heat pump", small: true },
  { src: "/email/opt-istore.jpg", label: "iStore", alt: "iStore all-in-one heat pump", small: true },
  { src: "/email/opt-mitsubishi.jpg", label: "Mitsubishi Electric", alt: "A Mitsubishi Electric split system", small: true },
  { src: "/email/opt-kaden.jpg", label: "Kaden", alt: "A Kaden split system", small: true },
];
