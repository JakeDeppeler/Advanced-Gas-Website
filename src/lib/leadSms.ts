import "server-only";
import { site } from "@/lib/site";

/**
 * Speed to lead.
 *
 * 15 of the first 37 website leads arrived outside business hours, and the
 * median wait for one of those to become a ServiceTitan job was 53 hours.
 * A paid lead is shared with whoever else the customer clicked on, and the
 * first business to make contact usually wins, so the moment a lead lands
 * two texts go out:
 *
 *   - to the customer: we have it, and when the call is coming;
 *   - to the on-call phones (LEAD_SMS_TO): who, what, where, and the rule
 *     for when to ring.
 *
 * Carried by Twilio over plain REST (no SDK, same as Resend). Off until
 * TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM exist, and a
 * failure here never fails the lead: the row is in the database and the
 * email has gone before this runs.
 */

const TZ = "Australia/Melbourne";

/** Opening hours in minutes past midnight, from the one record in site.ts. */
function hoursToday(): { open: number; close: number } {
  const h = site.hours[0];
  const m = (t: string) => { const [hh, mm] = t.split(":").map(Number); return hh * 60 + mm; };
  return { open: m(h.open), close: m(h.close) };
}

function melbourne(now: Date): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday").slice(0, 3));
  const minutes = (Number(get("hour")) % 24) * 60 + Number(get("minute"));
  return { weekday, minutes };
}

/**
 * When the office will ring, as words a customer reads. This is the "first
 * ring" rule written down: in hours it is now; after close it is first thing
 * next business morning; from Friday close to Monday open it is Monday.
 */
export function callWindow(now: Date = new Date()): { inHours: boolean; phrase: string } {
  const { weekday, minutes } = melbourne(now);
  const { open, close } = hoursToday();
  const weekdayNow = weekday >= 1 && weekday <= 5;
  if (weekdayNow && minutes >= open && minutes < close) return { inHours: true, phrase: "shortly" };
  if (weekdayNow && minutes < open) return { inHours: false, phrase: "this morning from 7am" };
  // After close Mon–Thu: tomorrow. Fri after close, Sat, Sun: Monday.
  if (weekday >= 1 && weekday <= 4) return { inHours: false, phrase: "tomorrow morning from 7am" };
  return { inHours: false, phrase: "first thing Monday morning" };
}

/** An Australian number as E.164, or null when it isn't one we can text. */
export function auMobile(raw: string | undefined | null): string | null {
  const d = (raw || "").replace(/[^\d+]/g, "");
  let n = d.startsWith("+") ? d.slice(1) : d;
  if (n.startsWith("0")) n = "61" + n.slice(1);
  if (n.startsWith("614") && n.length === 11) return "+" + n;
  return null; // landline, overseas, or garbage: no text, the email still goes
}

type Opts = {
  name: string; phone: string; service: string; place?: string | null;
  landing?: string | null; from?: string | null;
};

async function twilioSend(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const sender = process.env.TWILIO_FROM;
  if (!sid || !token || !sender) return false;
  const form = new URLSearchParams({ To: to, Body: body });
  // A Messaging Service SID, an alphanumeric sender ID or a number all work;
  // Twilio wants the first under a different key.
  if (/^MG[0-9a-f]{32}$/i.test(sender)) form.set("MessagingServiceSid", sender);
  else form.set("From", sender);
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    if (!res.ok) {
      console.error(`Twilio send failed (${res.status}) to ${to}: ${await res.text().catch(() => "")}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Twilio threw", e);
    return false;
  }
}

export function smsConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
}

/**
 * Text the customer and the on-call phones about a new lead.
 * Returns what went, for the route's response and the logs.
 */
export async function sendLeadSms(o: Opts, now: Date = new Date()): Promise<{ customer: boolean; team: number }> {
  if (!smsConfigured()) return { customer: false, team: 0 };
  const when = callWindow(now);
  const first = o.name.trim().split(/\s+/)[0] || "there";

  const customerTo = auMobile(o.phone);
  const customer = customerTo
    ? await twilioSend(
        customerTo,
        `Hi ${first}, Advanced Gas & Aircon here. We've got your ${o.service.toLowerCase()} request and we'll call ${when.phrase} to book your free quote visit. Urgent? Ring ${site.phone}.`,
      )
    : false;

  const team = (process.env.LEAD_SMS_TO || "").split(",").map((s) => auMobile(s.trim())).filter((s): s is string => !!s);
  const where = [o.place, o.landing && `via ${o.landing}`, o.from && `from ${o.from}`].filter(Boolean).join(" · ");
  const alert =
    `NEW WEB LEAD: ${o.service} · ${o.name} · ${o.phone}` +
    (where ? ` · ${where}` : "") +
    (when.inHours ? ` · Ring now (first caller wins).` : ` · After hours: ring ${when.phrase}, 7:30 first-ring rule.`);
  let sent = 0;
  for (const to of team) if (await twilioSend(to, alert)) sent++;

  return { customer, team: sent };
}
