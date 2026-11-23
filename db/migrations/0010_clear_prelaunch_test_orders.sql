-- One-time launch cleanup requested by the owner. Every order present before
-- this deployment was a test order because the shop had not been published.
-- Restore its reserved/committed stock before removing the test records.
create temporary table prelaunch_test_items on commit drop as
select i.variant_id, sum(i.qty)::integer as qty
from order_items i
join orders o on o.id = i.order_id
where i.variant_id is not null
  and o.stock_state in ('reserved', 'committed')
group by i.variant_id;

update variants v
set stock = v.stock + t.qty
from prelaunch_test_items t
where v.id = t.variant_id;

insert into inventory_adjustments
  (variant_id, product_name, size, colour, delta, stock_after, reason, actor, note)
select v.id, p.name, v.size, v.colour, t.qty, v.stock,
       'return', 'system', 'Pre-launch test order cleanup'
from prelaunch_test_items t
join variants v on v.id = t.variant_id
join products p on p.id = v.product_id;

delete from orders;

-- Customer rows here were created only by the deleted test checkouts. Keep
-- marketing subscribers elsewhere intact; this table is checkout-only.
delete from customers where not exists (
  select 1 from orders where orders.customer_id = customers.id
);
