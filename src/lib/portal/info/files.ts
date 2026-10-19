import "server-only";
import { getSettings, saveSettings } from "@/lib/portal/db";

/**
 * Documents kept on an Information page: the certificate of currency behind
 * the public liability figure, the WorkCover certificate, a licence card. One
 * hangs under the card it belongs to (by the card's name), or sits in the
 * page's Documents when it has no card of its own.
 *
 * The files are in the private bucket under info/; this is the list of them.
 * Kept apart from the page's words, so changing the page can't drop a file.
 */
export type InfoFile = {
  id: string;
  /** The card it's under ("Public liability"), or null for the page's Documents. */
  card: string | null;
  label: string;
  path: string;
  mime: string;
  bytes: number;
  at: string;
  by: string;
};

const KEY = "info_files";
type All = Record<string, InfoFile[]>;

export async function infoFiles(slug: string): Promise<InfoFile[]> {
  const all = (await getSettings<All>(KEY).catch(() => null)) ?? {};
  return Array.isArray(all[slug]) ? all[slug] : [];
}

export async function saveInfoFiles(slug: string, files: InfoFile[]): Promise<boolean> {
  const all = (await getSettings<All>(KEY).catch(() => null)) ?? {};
  all[slug] = files;
  return (await saveSettings(KEY, all)).ok;
}
