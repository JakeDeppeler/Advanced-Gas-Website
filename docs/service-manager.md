# Service manager

`/portal/service` (Team › Service manager). For the **Service manager** role,
and admins. A service manager sees the crew's performance, the quote
pipeline and team reports, but not pay, the bank or Xero (`lib/portal/caps.ts`:
role `service`, capability `team`).

To give someone a login: **Team**, add the person with their email and
role **Service manager**. They sign in with the emailed link like everyone
else.

## Tabs

- **Today:** the day's checks, in order, each one counted, with the jobs a
  click away: jobs running over their quoted hours, gear and bookings for the
  next few days, jobs that lost money this week, call-backs from the last
  fortnight, finished jobs not billed, customers waiting on a call, and quotes
  to follow up. Then what to do each week.
- **Team:** each tech this month, last month or the last 90 days. Jobs,
  invoiced, profit and margin, **profit an hour on site** (the efficiency
  figure, ranked), jobs that lost money, time on site against what the quote
  allowed, call-backs against their jobs, and selling (the wall's
  leaderboard, this month).
- **Money:** profit by kind of job, most first, and the jobs that lost the
  most.
- **Your role:** the Service Manager seat from **Roles**, which the owner
  edits.

## How the figures are worked out

`lib/portal/service/scoreTypes.ts` (tested by `npm run check:service`):

- Money and hours are **Profit on every job**'s: the invoice before GST, less
  equipment, materials and the hours on site at what an hour of the crew
  costs. A job two techs were on is split evenly. A tech isn't rated until
  they have 4 costed jobs in the period.
- **On time:** hours on site against the quote's allowed hours, on jobs that
  have both. More than 10% over counts as over.
- **Call-back:** we went back to the same site within 30 days of finishing a
  job, for a diagnostic, repair, leak or warranty, and the return wasn't
  booked from a quote (a diagnostic that sold a repair is a sale). It counts
  against whoever did the first job.

## Not yet

- **Calls:** how each person sounds on the phone comes with ServiceTitan
  Dispatch Pro, which records and coaches the calls.
- **Reviews by tech:** no review source is connected to the portal.
