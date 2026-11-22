-- VAULT 13: editable storefront hero and category images
create table if not exists public.storefront_media (
  key text primary key,
  url text not null,
  updated_at timestamptz not null default now()
);

-- The table is accessed only through the server API using the service-role key.
-- Do not add anon/authenticated write policies to this table.
alter table public.storefront_media enable row level security;
