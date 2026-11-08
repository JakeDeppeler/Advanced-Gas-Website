-- Review requests (lib/reviews/requests.ts): a job with a problem still open
-- (tagged Problem, or a call-back booked at the address) is "held" and asked
-- once it's fixed, or after 21 days regardless, rather than never asked.
-- Asking only happy customers breaks Google's rules and the ACL. "dropped"
-- closes off a held job that stopped qualifying (e.g. still unpaid weeks on).
alter table public.portal_review_requests drop constraint if exists portal_review_requests_status_check;
alter table public.portal_review_requests
  add constraint portal_review_requests_status_check check (status in ('sending', 'sent', 'failed', 'held', 'dropped'));
