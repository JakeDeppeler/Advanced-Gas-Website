-- A repair or service waiting on a part shows under "Sold, not booked" on
-- To order (job 20805, 11 Nov: the tech went on 10 Nov, the quote for a
-- Braemar fan motor sold, and the return visit isn't booked until the part
-- is in, so the part showed nowhere).
--
-- Until now a sold quote counted as unbooked only when no job had been made
-- from it. A repair's quote is written on the repair job itself, so it never
-- did. It counts now too when its repair or service job (the quote's own, or
-- one made from it) is Scheduled or on Hold with no visit booked ahead. Once
-- the return visit is booked the job leaves this list and its parts come
-- through upcoming_order_lines (0115) on that visit's week; anything ordered
-- from here is recorded against the quote, so it isn't ordered twice.
-- Installs, commercial jobs and quote visits are unchanged. Output columns
-- are unchanged.

create or replace view public.sold_unbooked_order_lines as
 WITH sales AS (
         SELECT e.id AS estimate_id,
            e.sold_on,
            NULLIF(TRIM(BOTH FROM (e.raw ->> 'name'::text)), ''::text) AS estimate_name,
            e.total_inc,
            oj.job_number AS quote_job_number,
            COALESCE(oj.customer_name, NULLIF(TRIM(BOTH FROM (l.raw ->> 'name'::text)), ''::text)) AS customer_name,
            COALESCE(oj.suburb, NULLIF(TRIM(BOTH FROM ((l.raw -> 'address'::text) ->> 'city'::text)), ''::text)) AS suburb,
            e.raw,
            oj.id AS quote_job_id,
            (NULLIF((e.raw ->> 'customerId'::text), ''::text))::bigint AS customer_id
           FROM ((st_estimates e
             LEFT JOIN st_jobs oj ON ((oj.id = e.job_id)))
             LEFT JOIN st_locations l ON ((l.id = (NULLIF((e.raw ->> 'locationId'::text), ''::text))::bigint)))
          WHERE e.status = 'Sold'
            AND e.sold_on >= now() - interval '90 days'
            AND coalesce(e.business_unit, '') !~* 'imported|default'
            AND (
              -- a sale nobody has made a job from yet (as before)
              ( NOT EXISTS (SELECT 1 FROM st_jobs j
                             WHERE nullif(j.raw ->> 'createdFromEstimateId', '')::bigint = e.id AND j.status <> 'Canceled')
                AND (oj.id IS NULL OR oj.job_type ~* '(quot|assess|estimat|consult)' OR coalesce(oj.business_unit, '') ~* 'assess') )
              -- or a repair or service waiting on its part: open, nothing booked ahead
              OR EXISTS (SELECT 1 FROM st_jobs w
                          WHERE (w.id = e.job_id OR nullif(w.raw ->> 'createdFromEstimateId', '')::bigint = e.id)
                            AND w.status IN ('Scheduled', 'Hold')
                            AND w.job_type !~* '^(install|commercial)'
                            AND w.job_type !~* '(quot|assess|estimat|consult)'
                            AND NOT EXISTS (SELECT 1 FROM job_next_appointment na WHERE na.job_id = w.id))
            )
        ), items AS (
         SELECT s.estimate_id,
            s.sold_on,
            s.estimate_name,
            s.total_inc,
            s.quote_job_number,
            s.customer_name,
            s.suburb,
            s.raw,
            s.quote_job_id,
            s.customer_id,
            (((it.value -> 'sku'::text) ->> 'id'::text))::bigint AS sku_id,
            TRIM(BOTH FROM ((it.value -> 'sku'::text) ->> 'name'::text)) AS sku_name,
            ((it.value -> 'sku'::text) ->> 'type'::text) AS sku_type,
            COALESCE(((it.value ->> 'qty'::text))::numeric, (1)::numeric) AS qty,
            ((it.value ->> 'unitCost'::text))::numeric AS unit_cost,
            ((it.value -> 'sku'::text) ->> 'displayName'::text) AS display_name
           FROM (sales s
             CROSS JOIN LATERAL jsonb_array_elements((s.raw -> 'items'::text)) it(value))
        )
 SELECT i.estimate_id,
    i.sold_on,
    i.estimate_name,
    i.total_inc,
    i.quote_job_number,
    i.customer_name,
    i.suburb,
    i.sku_id,
    i.sku_name,
    COALESCE(NULLIF(TRIM(BOTH FROM i.display_name), ''::text), i.sku_name) AS description,
    i.sku_type,
    i.qty,
    COALESCE(NULLIF((COALESCE(((pe.raw -> 'primaryVendor'::text) ->> 'cost'::text), ((pm.raw -> 'primaryVendor'::text) ->> 'cost'::text)))::numeric, (0)::numeric), i.unit_cost) AS unit_cost,
    COALESCE(m.supplier_id, v.supplier_id, r.supplier_id) AS supplier_id,
        CASE
            WHEN (COALESCE(m.supplier_id, v.supplier_id, r.supplier_id) IS NULL) THEN 'No supplier set for this item'::text
            ELSE NULL::text
        END AS issue,
    COALESCE(NULLIF(TRIM(BOTH FROM m.supplier_model), ''::text), NULLIF(TRIM(BOTH FROM pe.model), ''::text), i.sku_name) AS supplier_model,
    NULLIF(TRIM(BOTH FROM COALESCE(((pe.raw -> 'primaryVendor'::text) ->> 'vendorPart'::text), pm.vendor_part)), ''::text) AS supplier_part,
    i.quote_job_id,
    i.customer_id
   FROM (((((items i
     LEFT JOIN order_sku_map m ON ((m.sku_id = i.sku_id)))
     LEFT JOIN st_pricebook_equipment pe ON ((pe.id = i.sku_id)))
     LEFT JOIN st_pricebook_materials pm ON ((pm.id = i.sku_id)))
     LEFT JOIN LATERAL ( SELECT os.id AS supplier_id
           FROM order_suppliers os
          WHERE (os.active AND (COALESCE(pe.vendor, pm.vendor) IS NOT NULL) AND (lower(TRIM(BOTH FROM COALESCE(pe.vendor, pm.vendor))) IN ( SELECT lower(TRIM(BOTH FROM x.x)) AS lower
                   FROM unnest(os.st_vendor_names) x(x))))
         LIMIT 1) v ON (true))
     LEFT JOIN LATERAL ( SELECT rr.supplier_id
           FROM (order_supplier_rules rr
             JOIN order_suppliers os ON (((os.id = rr.supplier_id) AND os.active)))
          WHERE ((rr.sku_type = i.sku_type) AND (i.sku_name ~* rr.pattern))
          ORDER BY rr.priority, rr.id
         LIMIT 1) r ON (true))
  WHERE ((COALESCE(m.ignore, false) = false) AND (i.qty > (0)::numeric) AND (COALESCE(i.unit_cost, (0)::numeric) >= (0)::numeric) AND (i.sku_name !~* '^REBATE'::text) AND ((i.sku_type = ANY (ARRAY['Equipment'::text, 'Material'::text])) OR (r.supplier_id IS NOT NULL) OR (v.supplier_id IS NOT NULL) OR (m.supplier_id IS NOT NULL)));
