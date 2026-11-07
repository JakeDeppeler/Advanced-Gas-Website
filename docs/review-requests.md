# Google review emails

Marketing › Reviews › **Ask for a review by email**. Off until switched on.

- **Who:** a household job (a Domestic business unit) that is finished and
  paid, with something charged. Not real estate, retirement village,
  commercial or Warranty & Callbacks jobs, not quote visits, not a job tagged
  **Problem**, never an agency or our own address, and nobody more than once
  a year. One email per customer even with two jobs that week.
- **When:** at least 18 hours after the job was finished and no more than 7
  days after, between 9am and 7pm Monday to Saturday (Melbourne). Checked every
  ten minutes by the scheduled sync (`/api/reviews/run`), a few at a time.
- **What:** the wording on the page, with the customer's first name, the tech,
  the job and the suburb filled in, and a **Leave a Google review** button.
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
