-- VAULT 13: product media and storefront assignment
alter table public.products add column if not exists store text;
alter table public.products add column if not exists images jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists videos jsonb not null default '[]'::jsonb;

update public.products
set store = case
  when upper(coalesce(category, '')) in ('WATCH', 'WATCHES', 'ЦАГ') then 'watches'
  else 'culture'
end
where store is null;

-- Preserve the existing primary image as the first gallery image.
update public.products
set images = jsonb_build_array(image)
where (images is null or images = '[]'::jsonb)
  and image is not null
  and image <> '';

-- New Admin Panel values: store='watches'|'culture'; images/videos are JSON arrays of public URLs.
