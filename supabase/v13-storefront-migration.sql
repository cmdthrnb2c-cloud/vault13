-- Optional Supabase migration for assigning products to a storefront.
-- Existing WATCHES categories remain in WATCHES; all other categories go to CULTURE.
alter table public.products
add column if not exists store text;

update public.products
set store = case
  when upper(coalesce(category, '')) in ('WATCH', 'WATCHES', 'ЦАГ') then 'watches'
  else 'culture'
end
where store is null;

-- Future Admin Panel should write exactly: 'watches' or 'culture'.
