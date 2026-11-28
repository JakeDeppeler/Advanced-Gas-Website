/**
 * The suburb and postcode in an address typed by hand: "1 Sierra Circuit,
 * Pakenham VIC 3810", or Google's "12 Lamont Crescent, Cranbourne, Melbourne,
 * Victoria, 3977, Australia". The first part is the street, so an address
 * with nothing after it gives no suburb rather than a street name.
 */
export function placeFromAddress(address?: string): { suburb: string | null; postcode: string | null } {
  if (!address) return { suburb: null, postcode: null };
  // After the state, or anywhere past the street: "1234 Princes Highway" is a house number, not a postcode.
  const afterStreet = address.includes(",") ? address.slice(address.indexOf(",") + 1) : "";
  const postcode = address.match(/\b(?:VIC|Victoria)\b\s*,?\s*(\d{4})\b/i)?.[1] ?? afterStreet.match(/\b(\d{4})\b(?!.*\b\d{4}\b)/)?.[1] ?? null;
  const parts = address.split(",").map((x) => x.trim())
    // "Pakenham VIC 3810" → "Pakenham"; "Victoria", "3977", "Australia" and the "Melbourne" qualifier go.
    .map((x) => x.replace(/\s+(VIC|Vic|Victoria)\b.*$/, "").replace(/\s+\d{4}$/, "").trim())
    .filter((x) => x && !/^(australia|victoria|vic|melbourne|\d{4})$/i.test(x));
  const suburb = parts.length > 1 && /[a-z]/i.test(parts[parts.length - 1]) ? parts[parts.length - 1] : null;
  return { suburb, postcode };
}
