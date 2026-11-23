-- Cover foreign keys used by joins and cascading deletes.
create index admin_activity_admin_id_idx on admin_activity (admin_id);
create index admin_sessions_admin_id_idx on admin_sessions (admin_id);
create index collection_products_product_id_idx on collection_products (product_id);
create index inquiries_product_id_idx on inquiries (product_id);
create index inventory_adjustments_order_id_idx on inventory_adjustments (order_id);
create index order_items_product_id_idx on order_items (product_id);
create index order_items_variant_id_idx on order_items (variant_id);
create index orders_delivery_zone_id_idx on orders (delivery_zone_id);
create index products_category_id_idx on products (category_id);
create index push_subscriptions_inquiry_id_idx on push_subscriptions (inquiry_id);
