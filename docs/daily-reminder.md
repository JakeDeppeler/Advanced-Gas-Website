# Morning to-do email

Every weekday at about 7:30am (6:30am in winter), jake@ and admin@ get one
email listing what has to be done today, under headings
(`lib/reminders/daily.ts`, rules in `lib/reminders/dailyTypes.ts`):

| Heading | A job is on it when |
|---|---|
| Rubbish removal to book | it has **Rubbish Removal Not Booked** and not **Rubbish Removal Booked** |
| Systems to order | **System Not Ordered** and no "… System Ordered" tag (any brand's counts) |
| Materials to order | **Materials Not Ordered** and not **Materials Ordered** or **Materials Delivered** |
| Electrician (GTE) to book | **GTE Not Booked** and not **GTE Booked** |
| Finished yesterday, not billed | finished the working day before (Friday to Sunday on a Monday) and its invoice is still $0 |

- Only open jobs with a visit in the next seven days are listed, soonest
  first, each one linking to the job in ServiceTitan. Jobs further out are
  counted under the heading, not listed. A job with no visit booked yet isn't
  on it.
- The tags are read live from ServiceTitan when the email is put together,
  so something sorted last night doesn't show up. A job comes off the list
  once its tag says it's done, or once it's billed.
- Billing uses the same rules as **Jobs › Not billed**: quote visits and site
  assessments aren't counted, nor a visit whose sale is being done as its own
  job. Older unbilled jobs are counted under the heading.
- A day with nothing to do sends nothing.

Run by Vercel's cron (`/api/reminders/daily`, `30 20 * * 0-4` UTC). To see what
it would send without sending it:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://www.advancedgas.com.au/api/reminders/daily?preview=1"
```
