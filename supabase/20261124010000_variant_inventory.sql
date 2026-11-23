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
  product_variants jsonb;
  variant_color text;
  variant_size text;
  matching_stock integer;
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
     order by
       (value ->> 'product_id')::bigint,
       value ->> 'variant_color',
       value ->> 'variant_size'
  loop
    if item ->> 'availability' = 'PREORDER' then
      continue;
    end if;

    product_id := (item ->> 'product_id')::bigint;
    item_quantity := (item ->> 'quantity')::integer;
    variant_color := nullif(item ->> 'variant_color', '');
    variant_size := nullif(item ->> 'variant_size', '');

    if product_id is null or item_quantity is null or item_quantity <= 0 then
      raise exception 'Invalid order item';
    end if;

    if variant_color is not null or variant_size is not null then
      if variant_color is null or variant_size is null then
        raise exception 'Incomplete product variant';
      end if;

      select variants
        into product_variants
        from public.products
       where id = product_id
       for update;

      if not found then
        stock_issue := true;
        continue;
      end if;

      select (size_entry.value ->> 'stock')::integer
        into matching_stock
        from jsonb_array_elements(coalesce(product_variants, '[]'::jsonb)) as variant_entry(value)
        cross join jsonb_array_elements(variant_entry.value -> 'sizes') as size_entry(value)
       where variant_entry.value ->> 'color' = variant_color
         and size_entry.value ->> 'size' = variant_size
       limit 1;

      if matching_stock is null or matching_stock < item_quantity then
        stock_issue := true;
        continue;
      end if;

      update public.products p
         set variants = (
           select jsonb_agg(
             case
               when v.value ->> 'color' = variant_color then
                 jsonb_set(
                   v.value,
                   '{sizes}',
                   (
                     select jsonb_agg(
                       case
                         when sz.value ->> 'size' = variant_size then
                           jsonb_set(
                             sz.value,
                             '{stock}',
                             to_jsonb((sz.value ->> 'stock')::integer - item_quantity),
                             true
                           )
                         else sz.value
                       end
                       order by sz.ordinality
                     )
                     from jsonb_array_elements(v.value -> 'sizes')
                       with ordinality as sz(value, ordinality)
                   ),
                   true
                 )
               else v.value
             end
             order by v.ordinality
           )
           from jsonb_array_elements(coalesce(p.variants, '[]'::jsonb))
             with ordinality as v(value, ordinality)
         )
       where p.id = product_id;

    else
      update public.products
         set stock = stock - item_quantity
       where id = product_id
         and stock >= item_quantity;

      if not found then
        stock_issue := true;
      end if;
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
