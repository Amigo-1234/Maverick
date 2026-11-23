-- Initial launch availability: every current piece is sold in XL only.
insert into inventory_adjustments (variant_id, product_name, size, colour, delta, stock_after, reason, note, actor)
select v.id, p.name, v.size, v.colour,
       (case when v.size = 'XL' then greatest(v.stock, 1) else 0 end) - v.stock,
       case when v.size = 'XL' then greatest(v.stock, 1) else 0 end,
       'correction', 'Launch availability: XL only', 'system'
from variants v join products p on p.id = v.product_id
where v.stock <> case when v.size = 'XL' then greatest(v.stock, 1) else 0 end;

update variants
set stock = case when size = 'XL' then greatest(stock, 1) else 0 end;

update store_settings
set value = jsonb_set(
  value,
  '{supportContact}',
  to_jsonb(coalesce(nullif(value->>'whatsappDisplay', ''), value->>'whatsapp', ''))
)
where key = 'store';
