create table push_subscriptions (
  id          bigserial primary key,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  audience    text not null check (audience in ('admin','customer')),
  inquiry_id  integer references inquiries(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check ((audience = 'admin' and inquiry_id is null) or (audience = 'customer' and inquiry_id is not null))
);
create index push_subscriptions_audience on push_subscriptions (audience, inquiry_id);
