-- VAULT 13: clothing and footwear color/size variants
alter table public.products
  add column if not exists variants jsonb not null default '[]'::jsonb;

comment on column public.products.variants is
  'Color variants with images and per-size inventory for clothing and footwear';
