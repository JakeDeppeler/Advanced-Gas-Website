/**
 * Meta's send errors in words, kept apart from send.ts so the check script can
 * run them without a server. Read by numeric code only — the response body is
 * never shown, because a Graph error can quote the request, token and all.
 */
/** What a Meta error code means for the person who pressed send. */
export function metaSendError(code: number | null, subcode: number | null): string {
  if (code === 10 && subcode === 2018278) return "Meta says the reply window has closed. Ring them or wait for them to message again.";
  if (code === 10 || code === 200 || code === 230) return "The page isn't allowed to send messages yet. The Meta app needs pages_messaging (and instagram_manage_messages for Instagram) approved.";
  if (code === 190) return "The Facebook page token has expired. Generate a new one and set META_PAGE_TOKEN.";
  if (code === 551) return "This person can't be messaged right now (they may have blocked the page or left Facebook).";
  if (code === 100) return "Meta didn't recognise the recipient. They may have deleted the conversation.";
  if (code === 4 || code === 613) return "Meta is rate-limiting the page. Try again in a few minutes.";
  return `Meta refused the message${code ? ` (code ${code})` : ""}. Try again, or reply from Meta Business Suite.`;
}
