-- MAVERICK store schema (PostgreSQL 15+ / Supabase).
-- Every table has row-level security ON with no public policies: only the site's server
-- (which connects as the database owner through DATABASE_URL) can read or write.

-- ───────────── Settings ─────────────
create table store_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

create table delivery_zones (
  id          serial primary key,
  name        text not null,
  states      text[] not null default '{}',   -- empty = applies to every state not covered elsewhere
  fee         integer not null check (fee >= 0),
  eta         text not null,
  is_pickup   boolean not null default false,
  instructions text not null default '',
  active      boolean not null default true,
  sort        integer not null default 0
);

-- ───────────── Catalog ─────────────
create table categories (
  id      serial primary key,
  handle  text not null unique check (handle ~ '^[a-z0-9-]+$'),
  title   text not null,
  blurb   text not null default '',
  sort    integer not null default 0
);

create table media (
  id          uuid primary key default gen_random_uuid(),
  filename    text not null,
  mime        text not null,
  bytes       bytea not null,
  width       integer,
  height      integer,
  created_at  timestamptz not null default now()
);

create table products (
  id            serial primary key,
  slug          text not null unique check (slug ~ '^[a-z0-9-]+$'),
  code          text not null unique,
  name          text not null,
  colour_label  text not null default '',
  category_id   integer references categories(id) on delete set null,
  price         integer not null check (price >= 0),            -- naira
  compare_at    integer check (compare_at is null or compare_at > 0), -- original price when discounted
  status        text not null default 'draft' check (status in ('draft','published','archived')),
  featured      boolean not null default false,
  is_new        boolean not null default false,
  tag           text not null default '',
  summary       text not null default '',
  description   text not null default '',
  details       text[] not null default '{}',
  materials     text not null default '',
  care          text not null default '',
  extra_info    text not null default '',
  front         text,  front_tight  text,   -- 200x310 rail canvas + tightly cropped copy
  back          text,  back_tight   text,
  side          text,  side_tight   text,
  sort          integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table product_images (
  id          serial primary key,
  product_id  integer not null references products(id) on delete cascade,
  url         text not null,
  alt         text not null default '',
  sort        integer not null default 0
);
create index on product_images (product_id, sort);

create table variants (
  id          serial primary key,
  product_id  integer not null references products(id) on delete cascade,
  size        text not null,
  colour      text not null default '',
  stock       integer not null default 0 check (stock >= 0),   -- the database refuses negative stock
  low_stock_at integer not null default 3 check (low_stock_at >= 0),
  sku         text,
  sort        integer not null default 0,
  unique (product_id, size, colour)
);

create table collections (
  id          serial primary key,
  handle      text not null unique check (handle ~ '^[a-z0-9-]+$'),
  title       text not null,
  blurb       text not null default '',
  visible     boolean not null default true,
  sort        integer not null default 0
);

create table collection_products (
  collection_id integer not null references collections(id) on delete cascade,
  product_id    integer not null references products(id) on delete cascade,
  sort          integer not null default 0,
  primary key (collection_id, product_id)
);

-- ───────────── Customers & orders ─────────────
create table customers (
  id          serial primary key,
  email       text not null unique,
  name        text not null default '',
  phone       text not null default '',
  marketing   boolean not null default false,
  created_at  timestamptz not null default now()
);

create table discounts (
  id          serial primary key,
  code        text not null unique check (code = upper(code)),
  kind        text not null check (kind in ('percent','fixed')),
  value       integer not null check (value > 0),
  min_order   integer not null default 0 check (min_order >= 0),
  starts_at   timestamptz,
  expires_at  timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  used_count  integer not null default 0 check (used_count >= 0),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100)
);

create table orders (
  id                  uuid primary key default gen_random_uuid(),
  number              text not null unique,                 -- also the Paystack reference
  customer_id         integer references customers(id) on delete set null,
  email               text not null,
  phone               text not null,
  first_name          text not null,
  last_name           text not null,
  address             jsonb not null,                       -- {address1,address2,city,state,postcode,country}
  delivery_zone_id    integer references delivery_zones(id) on delete set null,
  delivery_label      text not null,
  delivery_eta        text not null,
  subtotal            integer not null check (subtotal >= 0),
  discount_code       text,
  discount_amount     integer not null default 0 check (discount_amount >= 0),
  delivery_fee        integer not null default 0 check (delivery_fee >= 0),
  total               integer not null check (total >= 0),
  currency            text not null default 'NGN',
  -- payment and fulfilment are tracked separately on purpose
  payment_status      text not null default 'pending'
                      check (payment_status in ('pending','paid','failed','abandoned','refunded','partially_refunded')),
  fulfilment_status   text not null default 'unfulfilled'
                      check (fulfilment_status in ('unfulfilled','processing','preparing','shipped','delivered','cancelled','on_hold','refund_requested')),
  stock_state         text not null default 'reserved' check (stock_state in ('reserved','committed','released')),
  reserved_until      timestamptz,
  paid_at             timestamptz,
  paystack_channel    text,
  refunded_amount     integer not null default 0 check (refunded_amount >= 0),
  carrier             text not null default '',
  tracking_ref        text not null default '',
  cancel_reason       text not null default '',
  needs_attention     text not null default '',              -- e.g. paid after reservation expired and stock ran out
  marketing           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on orders (created_at desc);
create index on orders (payment_status, fulfilment_status);
create index on orders (lower(email));
create index on orders (customer_id);

create table order_items (
  id          serial primary key,
  order_id    uuid not null references orders(id) on delete cascade,
  product_id  integer references products(id) on delete set null,
  variant_id  integer references variants(id) on delete set null,
  slug        text not null,
  code        text not null,
  name        text not null,
  colour      text not null,
  size        text not null,
  qty         integer not null check (qty > 0),
  unit_price  integer not null check (unit_price >= 0),
  total       integer not null check (total >= 0),
  image       text
);
create index on order_items (order_id);

create table order_events (
  id          serial primary key,
  order_id    uuid not null references orders(id) on delete cascade,
  kind        text not null check (kind in ('placed','payment','fulfilment','note','tracking','email','refund','stock')),
  from_status text,
  to_status   text,
  note        text not null default '',
  visible_to_customer boolean not null default false,
  actor       text not null default 'system',
  created_at  timestamptz not null default now()
);
create index on order_events (order_id, created_at);
-- At most one customer email per status per order: prevents duplicate notifications.
create unique index order_status_email_once on order_events (order_id, to_status) where kind = 'email';

create table processed_webhooks (
  id          text primary key,             -- event + reference; inserting twice fails, so each runs once
  received_at timestamptz not null default now()
);

-- ───────────── Inventory history ─────────────
create table inventory_adjustments (
  id          serial primary key,
  variant_id  integer references variants(id) on delete set null,
  product_name text not null,
  size        text not null,
  colour      text not null default '',
  delta       integer not null,
  stock_after integer not null,
  reason      text not null check (reason in ('reserve','release','sale','restock','correction','set','sold_out','return','created')),
  order_id    uuid references orders(id) on delete set null,
  actor       text not null default 'system',
  note        text not null default '',
  created_at  timestamptz not null default now()
);
create index on inventory_adjustments (created_at desc);
create index on inventory_adjustments (variant_id);

-- ───────────── Inquiries ─────────────
create table inquiries (
  id          serial primary key,
  name        text not null,
  email       text not null,
  phone       text not null default '',
  product_id  integer references products(id) on delete set null,
  product_name text not null default '',
  size        text not null default '',
  colour      text not null default '',
  message     text not null,
  status      text not null default 'new' check (status in ('new','in_progress','answered','closed')),
  notes       text not null default '',
  fingerprint text not null,                -- hash of email+product+message, blocks repeats
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on inquiries (created_at desc);
create index on inquiries (status);

-- ───────────── Admin ─────────────
create table admin_users (
  id            serial primary key,
  email         text not null unique,
  name          text not null,
  password_hash text not null,               -- scrypt
  role          text not null default 'staff' check (role in ('owner','staff')),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

create table admin_sessions (
  token_hash  text primary key,              -- sha256 of the cookie token; the token itself is never stored
  admin_id    integer not null references admin_users(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  ip          text not null default ''
);

create table admin_activity (
  id          serial primary key,
  admin_id    integer references admin_users(id) on delete set null,
  admin_email text not null,
  action      text not null,
  entity      text not null,
  entity_id   text not null default '',
  details     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index on admin_activity (created_at desc);

create table rate_limits (
  key          text primary key,
  window_start timestamptz not null,
  count        integer not null
);

-- ───────────── Lock everything down ─────────────
do $$
declare t text;
begin
  foreach t in array array['store_settings','delivery_zones','categories','media','products','product_images','variants',
    'collections','collection_products','customers','discounts','orders','order_items','order_events','processed_webhooks',
    'inventory_adjustments','inquiries','admin_users','admin_sessions','admin_activity','rate_limits']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
