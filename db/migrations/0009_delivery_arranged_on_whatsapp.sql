-- Delivery is quoted separately by the shop after checkout, so Paystack only
-- charges for merchandise. We retain zones for address coverage and ETA.
update delivery_zones set fee = 0 where fee <> 0;

update store_settings
set value = value || jsonb_build_object(
  'freeDeliveryOver', 0,
  'deliveryInstructions', 'Delivery fee is arranged separately with you on WhatsApp after payment.'
)
where key = 'store';
