-- An order's own delivery date and a note to the supplier.
--
-- The deliver-by date is worked out from the first install on the order, the
-- business days before it. `deliver_by` overrides that for one order when the
-- office wants it sooner or later than the install says; null keeps it worked
-- out. `supplier_note` is a line for the supplier about this order alone,
-- printed in the email under the delivery details.
alter table purchase_orders add column if not exists deliver_by date;
alter table purchase_orders add column if not exists supplier_note text;
