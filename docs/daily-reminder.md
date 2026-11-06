# Morning to-do email

Every weekday at about 7:30am (6:30am in winter), jake@ and admin@ get one
email listing what has to be done today, under headings
(`lib/reminders/daily.ts`, rules in `lib/reminders/dailyTypes.ts`):

| Heading | A job is on it when |
|---|---|
| Call back | an email to admin@ or jake@ in the last fortnight asked us to ring them, and its Outlook flag isn't marked complete |
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

## Call-backs

When the email drafting reads an email asking us to phone (lib/outlook/handle.ts),
the email gets the Outlook category **Call back** and a flag, and goes at the
top of the next morning's email with the name, number (a link a phone can dial)
and what it's about. Mark the flag complete in Outlook once the call is made
and it comes off; taking off both the flag and the category, or deleting the
email, does the same. After a fortnight unmarked it drops off.

## Bookings that confirm themselves

When the rubbish removal company (Veolia, WasteMate, any skip bin firm) or
the electrician (GT Electrics) emails to confirm a booking, the email is read
(lib/outlook/bookingConfirm.ts) and, if exactly one open job waiting on that
booking fits (its job number, or its address), the job's tag is swapped:
**Rubbish Removal Not Booked** to **Rubbish Removal Booked**, **GTE Not
Booked** to **GTE Booked**. A note goes on the job with the email, and the
email gets the Outlook category **Booking confirmed**. So the job comes off
the morning email by itself. If the confirmation has no job number and no
address, or more than one job fits, nothing is changed and the job stays on
the list to swap by hand.

Run by Vercel's cron (`/api/reminders/daily`, `30 20 * * 0-4` UTC). To see what
it would send without sending it:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://www.advancedgas.com.au/api/reminders/daily?preview=1"
```
