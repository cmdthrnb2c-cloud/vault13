alter table public.orders
  add column if not exists payment_status text not null default 'PENDING',
  add column if not exists order_status text not null default 'Төлбөр хүлээгдэж байна',
  add column if not exists qpay_invoice_id text,
  add column if not exists has_preorder boolean not null default false,
  add column if not exists expected_arrival_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists inventory_issue boolean not null default false,
  add column if not exists checkout_token_hash text;

alter table public.products enable row level security;
revoke insert, update, delete on public.products from public, anon, authenticated;
grant select on public.products to anon, authenticated;
drop policy if exists vault13_public_product_catalog_read on public.products;
create policy vault13_public_product_catalog_read
  on public.products
  for select
  to anon, authenticated
  using (true);

alter table public.orders enable row level security;
revoke all on public.orders from public, anon, authenticated;

create unique index if not exists orders_qpay_invoice_id_unique
  on public.orders (qpay_invoice_id)
  where qpay_invoice_id is not null;

create or replace function public.confirm_vault13_qpay_order(
  p_order_id bigint,
  p_invoice_id text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_order public.orders%rowtype;
  item jsonb;
  product_id bigint;
  item_quantity integer;
  stock_issue boolean := false;
begin
  select *
    into strict target_order
    from public.orders
   where id = p_order_id
   for update;

  if target_order.qpay_invoice_id is distinct from p_invoice_id then
    raise exception 'Invoice does not match order';
  end if;

  if target_order.payment_status = 'PAID' then
    return;
  end if;

  if target_order.payment_status <> 'PENDING' then
    raise exception 'Order is not awaiting payment';
  end if;

  for item in
    select value
      from jsonb_array_elements(target_order.items::jsonb) as entries(value)
     order by (value ->> 'product_id')::bigint
  loop
    if item ->> 'availability' = 'PREORDER' then
      continue;
    end if;

    product_id := (item ->> 'product_id')::bigint;
    item_quantity := (item ->> 'quantity')::integer;
    if product_id is null or item_quantity is null or item_quantity <= 0 then
      raise exception 'Invalid order item';
    end if;

    update public.products
       set stock = stock - item_quantity
     where id = product_id
       and stock >= item_quantity;

    if not found then
      stock_issue := true;
    end if;
  end loop;

  update public.orders
     set payment_status = 'PAID',
         order_status = 'Төлбөр баталгаажсан',
         paid_at = now(),
         inventory_issue = stock_issue,
         expected_arrival_at = case
           when target_order.has_preorder then now() + interval '9 days'
           else null
         end
   where id = p_order_id;
end;
$$;

revoke all on function public.confirm_vault13_qpay_order(bigint, text)
  from public, anon, authenticated;
grant execute on function public.confirm_vault13_qpay_order(bigint, text)
  to service_role;
