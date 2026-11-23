-- Owner-confirmed price for the black/red Horned M Ringer.
update products
set price = 25000,
    compare_at = null,
    updated_at = now()
where slug = 'horned-m-ringer';
