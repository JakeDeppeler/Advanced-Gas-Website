# Outlook reply drafts

Every email that arrives in **admin@** or **jake@** gets a reply drafted by
Claude and saved, unsent, in the same Outlook thread. You open the email, read
the draft, change what you like, and press Send. Nothing is sent automatically:
the app has no permission to send mail at all.

## What it does with each email

1. Microsoft tells the site the moment an email lands in the Inbox
   (`/api/email/outlook`). A catch-up runs from the dashboard sync and once a
   day (`/api/email/outlook/sweep`) for anything that notice missed.
2. It is skipped, with the reason recorded, if it is from the team, from a
   no-reply address, an automatic reply, a newsletter or mailing list, a
   meeting invite, older than three days, or already replied to (Sent Items
   are checked, so a reply sent from a phone counts).
3. Otherwise Claude reads the thread together with:
   - the business knowledge the chat inbox uses (services, published prices,
     service area), plus the office's notes and "never say" list from
     **Chats › Settings**
   - the sender's jobs in ServiceTitan, matched by their email address or by a
     job number in the subject, including a booked date and arrival window
4. Claude decides whether the email needs a reply. Supplier invoices,
   receipts and notifications don't get one.
5. The draft is saved as a reply in the thread, above the quoted email, signed
   "The Advanced Gas team" from admin@ and "Jake" from jake@.
6. If a person should deal with it (a gas smell, a complaint, a bill, a
   booking change), the original email gets the Outlook category
   **Needs a person** as well as the draft.
7. **Needs a person** comes off again once the email has been dealt with:
   a reply goes out in that thread (from Outlook, a phone or the web), or
   the draft is sent, or the draft is deleted because no reply was needed.
   Sent Items and Drafts are watched for this, so it happens within seconds;
   the catch-up checks for any it missed. A tag added by hand is never
   touched.
8. One draft per thread. When a newer email in a thread gets its draft, the
   older draft there is deleted, as long as nobody has edited it. An edited
   draft is always left alone.

What happened to each email is recorded in the `mail_drafts` table.

## Connecting it (once, about 20 minutes)

You need to be a Microsoft 365 admin.

### 1. Register the app

Go to [entra.microsoft.com](https://entra.microsoft.com), then **Applications → App registrations → New registration**.

- Name: `Advanced Gas Outlook drafts`
- Who can use it: *this organisational directory only*
- No redirect URI

On the app's **Overview** page, copy the **Application (client) ID** and the
**Directory (tenant) ID**.

Then go to **Certificates & secrets → New client secret**, choose 24 months,
and copy the secret's **Value** (not its ID). It is only shown once.
Put a reminder in the calendar to replace it before it expires.

Don't add mail permissions under **API permissions**. Granting Mail.ReadWrite
there opens every mailbox in the company. Step 2 grants it for the two
mailboxes only.

### 2. Allow it into admin@ and jake@ only

Go to **Enterprise applications** and open the same app. Copy its
**Object ID** from that page; the app registration's object ID is a different
number. Then, in PowerShell:

```powershell
Install-Module ExchangeOnlineManagement   # first time only
Connect-ExchangeOnline

New-ServicePrincipal -AppId <client id> -ObjectId <enterprise app object id> -DisplayName "Advanced Gas Outlook drafts"

New-ManagementScope -Name "Outlook drafts mailboxes" -RecipientRestrictionFilter "PrimarySmtpAddress -eq 'admin@advancedgas.com.au' -or PrimarySmtpAddress -eq 'jake@advancedgas.com.au'"

New-ManagementRoleAssignment -App <client id> -Role "Application Mail.ReadWrite" -CustomResourceScope "Outlook drafts mailboxes"
```

Check it took. The first two commands should say `InScope: True` and the
third `False`:

```powershell
Test-ServicePrincipalAuthorization -Identity <client id> -Resource admin@advancedgas.com.au
Test-ServicePrincipalAuthorization -Identity <client id> -Resource jake@advancedgas.com.au
Test-ServicePrincipalAuthorization -Identity <client id> -Resource dean@advancedgas.com.au
```

The role is **Mail.ReadWrite** and not Mail.Send on purpose. ReadWrite can read
an email and save a draft reply; there is no call this app can make that sends
one.

### 3. Give the site the keys

In Vercel, open the **advanced-gas-website-live** project, then
**Settings → Environment Variables** and add these for Production:

| Name | Value |
|---|---|
| `MS_GRAPH_TENANT_ID` | Directory (tenant) ID |
| `MS_GRAPH_CLIENT_ID` | Application (client) ID |
| `MS_GRAPH_CLIENT_SECRET` | the secret's Value |
| `OUTLOOK_DRAFT_MAILBOXES` | `admin@advancedgas.com.au,jake@advancedgas.com.au` |

`ANTHROPIC_API_KEY` is already there for the chat drafts. Redeploy so the new
variables are picked up.

### 4. Switch it on

Run the catch-up once by hand. It connects both mailboxes to the webhook:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://www.advancedgas.com.au/api/email/outlook/sweep
```

Each mailbox should come back with `"action": "created"`. Send a test email to
admin@ from a personal address, and a draft reply should be in the thread
within a minute.

Only email that arrives after this point gets a draft. It doesn't go back
through what is already in the Inbox, unless you ask for a catch-up.

### Catching up on older email

To draft replies for email already sitting in an Inbox, set a start time for
that mailbox in `portal_settings`, key `outlook_backfill`:

```json
{ "admin@advancedgas.com.au": "2026-10-29T00:00:00+11:00" }
```

Each catch-up run (Dashboard sync, or the daily cron) then works through that
mailbox's Inbox back to that time, four emails at a time, with the same skip
rules: nothing already replied to, nothing that already has a draft. When it
has been through everything, it removes the entry itself. A busy week can
take a few runs.

## Turning it off

Remove `OUTLOOK_DRAFT_MAILBOXES` in Vercel and redeploy. To cut access
completely, delete the app under **App registrations**.

## When something looks wrong

- **No drafts at all.** Run the catch-up URL above. Its JSON names the
  problem: a refused sign-in (wrong ID or an expired secret), `ErrorAccessDenied`
  (step 2 is missing or not yet applied; Exchange can take up to an hour), or a
  missing key.
- **One email got no draft.** Its row in `mail_drafts` has the reason.
- **A draft says something wrong.** The facts it may use come from the
  website's service pages and **Chats › Settings**; correct them there.
