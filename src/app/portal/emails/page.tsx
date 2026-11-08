import { redirect } from "next/navigation";
import { getPortalUser } from "@/lib/portal/session";
import { can } from "@/lib/portal/caps";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalBack } from "@/components/portal/PortalBack";
import { Locked } from "@/components/portal/Locked";
import { Card, Group, Head, Lh, Row, Say } from "@/components/portal/kit/Kit";
import { loadTemplates, type StoredTemplate } from "@/lib/email/templates/store";
import { GROUPS, SERIES } from "@/lib/email/templates/types";
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

  const { templates, ok } = await loadTemplates();
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
        <Say>
          The follow-ups and the &ldquo;thanks for going ahead&rdquo; email aren&rsquo;t going to customers yet: they start once the sender is switched on, and
          whatever&rsquo;s saved here then is what goes.
        </Say>

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
          <p className="em-foot">There&rsquo;s no &ldquo;you&rsquo;re booked in&rdquo; email from us: ServiceTitan sends its own confirmation with the day and arrival time.</p>
        </Card>

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

