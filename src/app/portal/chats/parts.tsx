import { CHANNEL_LABEL, type ChatChannel } from "@/lib/chat/chatTypes";

/** "4 min", "3 h", "Tue" — how long somebody has been waiting, at a glance. */
export function ago(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h`;
  return new Date(iso).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short" });
}

export const stamp = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/**
 * Which channel, as a mark and its name. The letter is the signal, the
 * colour only agrees with it — three tints nobody is asked to tell apart.
 */
export function ChannelMark({ channel }: { channel: ChatChannel }) {
  const letter = channel === "web" ? "W" : channel === "messenger" ? "M" : "IG";
  return (
    <span className={`ch-mark ch-mark--${channel}`} title={CHANNEL_LABEL[channel]}>
      <span aria-hidden="true">{letter}</span>
      <span className="sr-only">{CHANNEL_LABEL[channel]}</span>
    </span>
  );
}
