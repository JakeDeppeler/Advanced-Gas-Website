/**
 * Faces for customer emails: whose photo goes next to their name. Only people
 * we have a real headshot of (the About page shoot); everyone else gets their
 * initials in a circle rather than a stock face or a photo of someone else.
 * Add a headshot to public/email/ as a square JPG and a line here.
 */

const HEADSHOTS: Record<string, string> = {
  "dean winbanks": "/email/tech-dean.jpg",
  "jye stephens": "/email/tech-jye.jpg",
  "jake deppeler": "/email/tech-jake.jpg",
};

export function headshot(name: string | null | undefined): string | null {
  return HEADSHOTS[(name ?? "").trim().toLowerCase().replace(/\s+/g, " ")] ?? null;
}

export type SignerKey = "jake" | "dean" | "team";

export const SIGNERS: Record<SignerKey, { label: string; name: string; role: string; photo: string | null }> = {
  jake: { label: "Jake Deppeler", name: "Jake Deppeler", role: "Advanced Gas & Aircon", photo: headshot("Jake Deppeler") },
  dean: { label: "Dean Winbanks", name: "Dean Winbanks", role: "Director, Advanced Gas & Aircon", photo: headshot("Dean Winbanks") },
  team: { label: "The team (no photo)", name: "The Advanced Gas team", role: "Family owned, Pakenham", photo: null },
};

export const signerKey = (v: unknown): SignerKey => (v === "dean" || v === "team" ? v : "jake");
