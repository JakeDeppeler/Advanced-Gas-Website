/** The key an order line is matched to a Factory stock tag on: the pricebook item where there is one, else the model. */
export const stockKey = (l: { sku_id: number | null; supplier_model: string | null; sku_name: string | null }) =>
  l.sku_id != null ? `sku:${l.sku_id}` : `m:${(l.supplier_model ?? l.sku_name ?? "").trim().toLowerCase()}`;
