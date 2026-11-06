-- Orders placed in Reece maX from the portal (Jake, 2 Nov: "click that button
-- and it orders everything in maX"). One maX order per job, as the office
-- enters them by hand; each placed one is recorded here as it's made, so a
-- send that fails part-way never places a job twice when it's tried again.
--
--   [{ "key": "job:303041482", "job_number": "20721", "reece_id": 12345678,
--      "status": "Submited", "at": "2026-11-02T00:00:00Z" }, ...]
--
-- Idempotent.

alter table public.purchase_orders add column if not exists reece_orders jsonb;
