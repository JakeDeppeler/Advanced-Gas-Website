import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Card, Group, Head, Lh, Row, Say } from "@/components/portal/kit/Kit";
import { loadTemplates, type StoredTemplate } from "@/lib/email/templates/store";
import { GROUPS, SERIES } from "@/lib/email/templates/types";
import { awaitingNow, followUpBoard, type BoardLine } from "@/lib/quotes/followUps";
import { stJobUrl } from "@/lib/dashboard/toBill";
import { FollowUpSwitch } from "@/components/portal/emails/FollowUpSwitch";
import { AutoEmailSwitch } from "@/components/portal/emails/AutoEmailSwitch";
import { autoSentCounts, loadAutoSettings } from "@/lib/autoEmails/run";
import { AUTO_KINDS, type AutoKind } from "@/lib/autoEmails/rules";
import { addSeriesEmail } from "./actions";
import "./emails.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customer emails · Team portal" };

/**
 * Every email the portal sends customers by itself, with the words in each
 * (Jake, 8 Nov: "a way to build an email template and then edit the templates
 * we have"). Each opens in the editor; a series can have emails added to it.
 */
export default async function EmailsPage({ searchParams }: { searchParams: { error?: string; deleted?: string } }) {
  const user = await getPortalUser();
  if (!user) redirect("/portal/login");
  if (!can(user, "overhead")) return <Locked user={user} what="Customer emails" forWhom="managers" />;

  const [{ templates, ok }, board, awaiting, auto, autoSent] = await Promise.all([loadTemplates(), followUpBoard(), awaitingNow(), loadAutoSettings(), autoSentCounts()]);
  // Each after-the-quote email's switch, under the card its words are in.
  const switches = (kinds: AutoKind[]) => (
    <div className="em-autos">
      {kinds.map((k) => { const d = AUTO_KINDS.find((x) => x.k === k)!; return <AutoEmailSwitch key={k} kind={k} label={d.label} when={d.when} on={auto[k].on} since={auto[k].since} sent={autoSent[k] ?? 0} />; })}
    </div>
  );
  const live = board.lines.filter((l) => l.status === "active");
  const past = board.lines.filter((l) => l.status !== "active");
  const by = (g: string) => templates.filter((t) => t.group === g);

  return (
    <PortalShell user={user}>
      <PortalBack href="/portal/marketing" label="Marketing" />
      <div className="pk em">
        <Head
          title="Customer emails"
          sub="What customers get from us, and the words in them"
          info={[
            ["Editing one", "Open it, change the words, photos or figures, and watch the preview beside it. Send yourself a test, then save. What you save is what goes."],
            ["Words in braces", "{first} becomes their first name, {phone} our number, and so on. Each email lists the ones it can use."],
            ["Standard wording", "Every email starts as the wording we wrote together. “Back to the standard wording” puts it back, and every saved version is kept, so nothing's lost."],
            ["Adding one", "Add an email to a follow-up series and pick its day. It starts switched off, so it can't go until you've written it and turned it on."],
          ]}
        />
        {!ok && <div className="pt-note pt-note--warn">Your saved changes couldn&rsquo;t be read just now, so this shows the standard wording. Nothing&rsquo;s lost; try again in a minute.</div>}
        {searchParams.error && <div className="pt-note pt-note--warn">{searchParams.error}</div>}
        {searchParams.deleted && <div className="pt-note">Deleted. It&rsquo;s in that email&rsquo;s history if you need it back; ask and it can be restored.</div>}
        <Card title="Sending the follow-ups" aside={board.settings.on ? `On since ${day(board.settings.since)}${board.settings.by ? `, by ${board.settings.by.split(" ")[0]}` : ""}` : "Off"}>
          <Say>
            {board.settings.on
              ? <>On. {live.length ? <><b>{live.length}</b> quote{live.length === 1 ? "" : "s"} getting them now.</> : "No quotes in the series yet."}{board.leftAlone ? <> The {board.leftAlone} already out when it was switched on are left alone.</> : null}</>
              : <>Off. Nothing goes to customers.{awaiting != null ? <> When it&rsquo;s switched on, the {awaiting} quote{awaiting === 1 ? "" : "s"} tagged Awaiting Quote Approval now {awaiting === 1 ? "is" : "are"} left alone.</> : null}</>}
          </Say>
          <ul className="em-rules">
            <li><b>Which quotes:</b> household quotes on a job, once the office tags the job <b>Awaiting Quote Approval</b> after sending it. The days count from then. A quote written on the customer with no job can&rsquo;t carry the tag, and ServiceTitan doesn&rsquo;t say when a quote&rsquo;s been sent, so those don&rsquo;t get them.</li>
            <li><b>When:</b> the days set below, between 9am and 7pm Monday to Saturday, never two within two days. From quotes@, signed by whoever quoted it; replies come to admin@.</li>
            <li><b>Stops when:</b> it sells, they tap a button, they email us, someone logs a call on the Pipeline, it&rsquo;s closed or lost, or the tag comes off. Each one sent is noted on the job in ServiceTitan.</li>
          </ul>
          <FollowUpSwitch on={board.settings.on} awaiting={awaiting} />
          {!board.ok && <p className="em-foot">What&rsquo;s been sent couldn&rsquo;t be read just now.</p>}
          {live.length > 0 && (
            <>
              <Lh>Getting them now</Lh>
              <Group>{live.map((l) => <BoardRow key={l.key} l={l} />)}</Group>
            </>
          )}
          {past.length > 0 && (
            <details className="em-past">
              <summary>Finished or stopped in the last 30 days ({past.length})</summary>
              <Group>{past.map((l) => <BoardRow key={l.key} l={l} />)}</Group>
            </details>
          )}
        </Card>

        <Card title={GROUPS.followup.label} aside={GROUPS.followup.when}>
          {SERIES.map((s) => {
            const list = by("followup").filter((t) => t.series === s.k).sort((a, b) => (a.day ?? 0) - (b.day ?? 0));
            return (
              <div key={s.k} className="em-series">
                <Lh>{s.label} <span className="em-lh-sub">· {s.what}</span></Lh>
                <Group>
                  {list.map((t) => <TemplateRow key={t.key} t={t} />)}
                </Group>
                <form action={addSeriesEmail} className="em-add">
                  <input type="hidden" name="series" value={s.k} />
                  <button type="submit" className="pt-btn pt-btn--ghost">+ Add an email to {s.label.toLowerCase()}</button>
                </form>
              </div>
            );
          })}
        </Card>

        <Card title={GROUPS.reply.label} aside={GROUPS.reply.when}>
          <Group>{by("reply").map((t) => <TemplateRow key={t.key} t={t} />)}</Group>
          <p className="em-foot">You get an email too, written as their message to whoever quoted it, with a button to the job. That one isn&rsquo;t edited here.</p>
        </Card>

        <Card title={GROUPS.sold.label} aside={GROUPS.sold.when}>
          <Group>{by("sold").map((t) => <TemplateRow key={t.key} t={t} />)}</Group>
          {switches(["sold", "pickaday"])}
          <p className="em-foot">There&rsquo;s no &ldquo;you&rsquo;re booked in&rdquo; email from us: ServiceTitan sends its own confirmation with the day and arrival time.</p>
        </Card>

        {(["done", "invoice", "service"] as const).map((g) => (
          <Card key={g} title={GROUPS[g].label} aside={GROUPS[g].when}>
            <Group>{by(g).map((t) => <TemplateRow key={t.key} t={t} />)}</Group>
            {switches([g === "done" ? "done" : g === "invoice" ? "invoice" : "service"])}
          </Card>
        ))}

        <Card title="Edited somewhere else">
          <Group>
            <Row title="Google review request" sub="The day after a paid household job. Edited on Marketing › Reviews, with its on/off switch." href="/portal/marketing?tab=reviews" />
            <Row title="Work order: the tenant" sub="When a work order comes in with the tenant's email. Edited on the Work orders page." href="/portal/work-orders" />
            <Row title="Website enquiry: thanks, we've got it" sub="Straight after the quote form. Still the older look, and not editable yet; ask to have it moved here." />
          </Group>
        </Card>
      </div>
    </PortalShell>
  );
}

const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short" }) : "");

function BoardRow({ l }: { l: BoardLine }) {
  const sent = l.sent.filter((s) => s.status === "sent").length;
  const failed = l.sent.some((s) => s.status === "failed");
  const sub = l.status === "active"
    ? `${sent} of ${l.total} sent${l.next ? ` · next: ${l.next.name}, ${day(l.next.on)}` : ""}${failed ? " · one didn't send, trying again" : ""}`
    : `${l.reason ?? (l.status === "done" ? "All sent" : "Stopped")}${sent ? ` · ${sent} sent` : ""}`;
  return (
    <Row
      title={<>{l.customer ?? "A customer"}{l.suburb ? <span className="em-sub2">, {l.suburb}</span> : null}</>}
      sub={<>{l.jobNumber ? `Job ${l.jobNumber} · ` : ""}{sub}</>}
      href={l.jobId ? stJobUrl(l.jobId) : undefined}
    />
  );
}

const when = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short" });

function TemplateRow({ t }: { t: StoredTemplate }) {
  const state = !t.active ? "Off" : t.editedAt ? `Edited${t.editedBy ? ` by ${t.editedBy.split(" ")[0]}` : ""}, ${when(t.editedAt)}` : t.builtIn ? "Standard wording" : "Added";
  return (
    <Row
      lead={t.series ? <span className={`em-day${t.active ? "" : " off"}`}>{t.day != null ? <>Day<b>{t.day}</b></> : "—"}</span> : undefined}
      title={<>{t.name}{!t.active && <span className="em-off">Off</span>}</>}
      sub={<><span className="em-subj">{t.subject || "No subject yet"}</span> · {state}</>}
      href={`/portal/emails/${t.key}`}
    />
  );
}

