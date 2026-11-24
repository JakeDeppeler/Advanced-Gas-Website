"use server";

import { revalidatePath } from "next/cache";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { saveFilingSettings } from "@/lib/outlook/filing";
import { wordsFromText } from "@/lib/outlook/filingTypes";
import type { FilingFormValues } from "@/components/portal/EmailFilingForm";

/** Moving the office's email around is a manager's call, as the tenant email's wording is. */
export async function saveEmailFilingAction(v: FilingFormValues): Promise<{ ok: boolean; error?: string }> {
  const me = await getPortalUser();
  if (!me || !can(me, "overhead")) return { ok: false, error: "Only managers can change how email is filed." };
  const mode = v.mode === "trial" || v.mode === "on" ? v.mode : "off";
  const res = await saveFilingSettings(
    {
      mode,
      fileAfterReply: Boolean(v.fileAfterReply),
      protectedWords: wordsFromText(String(v.words ?? "")),
      neverFolders: [...new Set((Array.isArray(v.never) ? v.never : []).map((n) => String(n).trim()).filter(Boolean))].slice(0, 100),
    },
    me.name,
  );
  revalidatePath("/portal/email-filing");
  return res.ok ? { ok: true } : { ok: false, error: "Couldn't save. Try again." };
}
