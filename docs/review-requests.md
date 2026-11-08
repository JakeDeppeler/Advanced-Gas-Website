# Google review emails

Marketing › Reviews › **Ask for a review by email**. Off until switched on.

- **Who:** a household job (a Domestic business unit) that is finished and
  paid, with something charged. Not real estate, retirement village,
  commercial or Warranty & Callbacks jobs, not quote visits, never an agency
  or our own address, and nobody more than once a year. One email per
  customer even with two jobs that week.
- **Held, not dropped:** a job tagged **Problem**, or with a warranty or
  call-back job open at the same address since, waits ("Waiting" in Asked
  lately) and is asked once that's cleared, or after 21 days regardless.
  Asking only happy customers isn't allowed: Google's review policy bans
  selective asking, and the ACCC took Meriton to court for keeping review
  invitations from guests who'd complained. Fixing it first is the lever.
- **When:** at least 18 hours after the job was finished and no more than 7
  days after, between 9am and 7pm Monday to Saturday (Melbourne). Checked every
  ten minutes by the scheduled sync (`/api/reviews/run`), a few at a time.
- **What:** the wording on the page, with the customer's first name, the tech,
  the job and the suburb filled in, and a **Leave a Google review** button,
  in the shared customer layout (`lib/email/premium.ts`): a photo the tech took
  on the job across the top, one that shows the whole finished system:
  Claude looks at the job's six newest photos and picks one, or none
  (`lib/email/jobPhoto.ts`, shrunk by
  Next's image optimiser through the signed `/api/email-photo` route, then
  attached to the email), else a stock photo of that kind of job, the tech's name and headshot (initials if we have no
  photo; add one in `lib/email/team.ts`), and the chosen signer's photo at the
  bottom. Images are JPGs in `public/email/` because Outlook doesn't show WebP.
  Everyone who fits gets the button. Google doesn't allow asking only the
  customers expected to be happy, so the "reply if anything wasn't right" line
  goes to everyone. Sent from reviews@, replies to admin@.
- **The link:** the "Ask for reviews" link from the Google Business Profile,
  pasted on the page (only Google links are accepted), else built from
  `GOOGLE_PLACE_ID`. The button goes through `/r/<id>` on our site, which counts
  the click and sends them on to Google, so **Asked lately** shows who opened
  it. Google doesn't say who left a review.
- **Send me a test** sends the email to you with made-up details.

Rules in `lib/reviews/requestTypes.ts` (`npm run check:reviews`), sending in
`lib/reviews/requests.ts`, one row per job in `portal_review_requests`
(migration 0108).
