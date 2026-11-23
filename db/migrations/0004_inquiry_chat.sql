-- Two-way customer/owner chat built on the existing product inquiry inbox.
alter table inquiries add column customer_token_hash text;
alter table inquiries add column customer_last_read_at timestamptz;
alter table inquiries add column admin_last_read_at timestamptz;

create table inquiry_messages (
  id          bigserial primary key,
  inquiry_id  integer not null references inquiries(id) on delete cascade,
  sender      text not null check (sender in ('customer','admin')),
  author      text not null default '',
  body        text not null check (char_length(body) between 1 and 3000),
  created_at  timestamptz not null default now()
);
create index inquiry_messages_thread on inquiry_messages (inquiry_id, created_at, id);
alter table inquiry_messages enable row level security;

-- Preserve every existing inquiry as the first message in its conversation.
insert into inquiry_messages (inquiry_id, sender, author, body, created_at)
select id, 'customer', name, message, created_at from inquiries;
