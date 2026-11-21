-- Confirmed by the owner on 21 November 2026 for the selected Drop 01 pieces.
update products
set price = 27000,
    compare_at = null,
    updated_at = now()
where slug in (
  'strike-tee-black-blue',
  'horned-m-ringer',
  'strike-tee-white-yellow'
);
