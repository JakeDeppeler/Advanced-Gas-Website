-- Parts sold on repair and service jobs reach To order (job 20805, 11 Nov:
-- a Braemar fan motor on a sold "Heater Repairs" quote never showed).
--
-- Until now only Install and Commercial jobs were read, so a repair or a
-- service whose quote carried a part was left to be ordered by memory. They
-- come in now when their sold quote has an Equipment or Material line.
--
-- Quotation jobs stay out: the install job made from a sold quote already
-- carries its parts (createdFromEstimateId), and reading the quote visit too
-- would order everything twice. A repair or service with no sold quote is
-- normal (most are done from van stock), so only Install and Commercial jobs
-- are flagged "No sold quote linked". Output columns are unchanged.

create or replace view public.upcoming_order_lines as
 WITH install_jobs AS (
         SELECT j.id AS job_id,
            j.job_number,
            j.job_type,
            j.customer_name,
            j.suburb,
            j.status,
            ((na.start_at AT TIME ZONE 'Australia/Melbourne'::text))::date AS install_date,
            na.start_at AS appointment_start,
            (NULLIF((j.raw ->> 'createdFromEstimateId'::text), ''::text))::bigint AS from_estimate_id,
            ((j.job_type ~~* 'Install%'::text) OR (j.job_type ~~* 'Commercial%'::text)) AS is_install
           FROM (st_jobs j
             LEFT JOIN job_next_appointment na ON ((na.job_id = j.id)))
          WHERE ((j.status = ANY (ARRAY['Scheduled'::text, 'Hold'::text]))
            AND ((j.job_type ~~* 'Install%'::text) OR (j.job_type ~~* 'Commercial%'::text)
              OR ((j.job_type !~~* 'Quotation%'::text) AND (EXISTS ( SELECT 1
                   FROM st_estimates se
                     CROSS JOIN LATERAL jsonb_array_elements((se.raw -> 'items'::text)) sit(value)
                  WHERE ((se.status = 'Sold'::text)
                    AND ((se.job_id = j.id) OR (se.id = (NULLIF((j.raw ->> 'createdFromEstimateId'::text), ''::text))::bigint))
                    AND (((sit.value -> 'sku'::text) ->> 'type'::text) = ANY (ARRAY['Equipment'::text, 'Material'::text]))
                    AND (COALESCE(((sit.value ->> 'qty'::text))::numeric, (1)::numeric) > (0)::numeric)))))))
        ), job_quote AS (
         SELECT ij.job_id,
            ij.job_number,
            ij.job_type,
            ij.customer_name,
            ij.suburb,
            ij.status,
            ij.install_date,
            ij.appointment_start,
            ij.from_estimate_id,
            ij.is_install,
            e.id AS estimate_id
           FROM (install_jobs ij
             LEFT JOIN LATERAL ( SELECT e_1.id
                   FROM st_estimates e_1
                  WHERE ((e_1.status = 'Sold'::text) AND ((e_1.job_id = ij.job_id) OR (e_1.id = ij.from_estimate_id)))
                  ORDER BY (e_1.id = ij.from_estimate_id) DESC, e_1.sold_on DESC NULLS LAST
                 LIMIT 1) e ON (true))
        ), items AS (
         SELECT jq.job_id,
            jq.job_number,
            jq.job_type,
            jq.customer_name,
            jq.suburb,
            jq.status,
            jq.install_date,
            jq.appointment_start,
            jq.from_estimate_id,
            jq.estimate_id,
            (((it.value -> 'sku'::text) ->> 'id'::text))::bigint AS sku_id,
            TRIM(BOTH FROM ((it.value -> 'sku'::text) ->> 'name'::text)) AS sku_name,
            ((it.value -> 'sku'::text) ->> 'type'::text) AS sku_type,
            COALESCE(((it.value ->> 'qty'::text))::numeric, (1)::numeric) AS qty,
            ((it.value ->> 'unitCost'::text))::numeric AS unit_cost,
            ((it.value -> 'sku'::text) ->> 'displayName'::text) AS display_name
           FROM ((job_quote jq
             JOIN st_estimates e ON ((e.id = jq.estimate_id)))
             CROSS JOIN LATERAL jsonb_array_elements((e.raw -> 'items'::text)) it(value))
        )
 SELECT i.job_id,
    i.job_number,
    i.job_type,
    i.customer_name,
    i.suburb,
    i.install_date,
    i.estimate_id,
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
    i.appointment_start,
    NULLIF(TRIM(BOTH FROM COALESCE(((pe.raw -> 'primaryVendor'::text) ->> 'vendorPart'::text), pm.vendor_part)), ''::text) AS supplier_part
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
  WHERE ((COALESCE(m.ignore, false) = false) AND (i.qty > (0)::numeric) AND (COALESCE(i.unit_cost, (0)::numeric) >= (0)::numeric) AND (i.sku_name !~* '^REBATE'::text) AND ((i.sku_type = ANY (ARRAY['Equipment'::text, 'Material'::text])) OR (r.supplier_id IS NOT NULL) OR (v.supplier_id IS NOT NULL) OR (m.supplier_id IS NOT NULL)))
UNION ALL
 SELECT jq.job_id,
    jq.job_number,
    jq.job_type,
    jq.customer_name,
    jq.suburb,
    jq.install_date,
    NULL::bigint AS estimate_id,
    NULL::bigint AS sku_id,
    NULL::text AS sku_name,
    NULL::text AS description,
    NULL::text AS sku_type,
    NULL::numeric AS qty,
    NULL::numeric AS unit_cost,
    NULL::text AS supplier_id,
    'No sold quote linked to this install job'::text AS issue,
    NULL::text AS supplier_model,
    jq.appointment_start,
    NULL::text AS supplier_part
   FROM job_quote jq
  WHERE ((jq.estimate_id IS NULL) AND jq.is_install);
