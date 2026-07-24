-- Atomic shop balance helpers for purchase requests.
-- Earned points match evaluation_points (daily base only; growth/recovery ledgers come later).

create or replace function public.student_available_balance(p_student_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with earned as (
    select coalesce(sum(
      e.attitude::integer
      + e.participation::integer
      + e.homework::integer
      + case
          when e.attitude and e.participation and e.homework then 2
          else 0
        end
      + case
          when cardinality(coalesce(r.praise_tags, '{}'::text[])) > 0 then 2
          else 0
        end
      + case
          when e.is_lucky
               and e.attitude
               and e.participation
               and e.homework then 5
          else 0
        end
    ), 0)::integer as points
    from public.evaluations e
    join public.sessions s on s.id = e.session_id
    left join public.reflections r
      on r.student_id = e.student_id
     and r.session_id = e.session_id
    where e.student_id = p_student_id
      and s.session_date <= (timezone('Asia/Seoul', now()))::date
  ),
  reserved_or_spent as (
    select coalesce(sum(p.price_paid), 0)::integer as points
    from public.purchases p
    where p.student_id = p_student_id
      and p.status in ('pending', 'approved')
  )
  select greatest(
    0,
    (select points from earned) - (select points from reserved_or_spent)
  );
$$;

revoke all on function public.student_available_balance(uuid) from public;
grant execute on function public.student_available_balance(uuid) to authenticated;

create or replace function public.request_purchase(p_item_id uuid)
returns public.purchases
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_item public.shop_items;
  student_row public.students;
  existing_pending integer;
  month_count integer;
  season_count integer;
  available_points integer;
  created_purchase public.purchases;
begin
  if auth.uid() is null then
    raise exception 'student session required';
  end if;

  select *
  into student_row
  from public.students
  where auth_user_id = auth.uid()
    and status = 'active'
  limit 1
  for update;

  if student_row.id is null then
    raise exception 'active student required';
  end if;

  select *
  into target_item
  from public.shop_items
  where id = p_item_id
    and room_id = student_row.room_id
    and is_active = true;

  if target_item.id is null then
    raise exception 'shop item not found';
  end if;

  select count(*)
  into existing_pending
  from public.purchases
  where student_id = student_row.id
    and item_id = target_item.id
    and status = 'pending';

  if existing_pending > 0 then
    raise exception 'purchase already pending';
  end if;

  if target_item.limit_month is not null then
    select count(*)
    into month_count
    from public.purchases
    where student_id = student_row.id
      and item_id = target_item.id
      and status in ('pending', 'approved')
      and date_trunc('month', requested_at) = date_trunc('month', now());

    if month_count >= target_item.limit_month then
      raise exception 'monthly purchase limit reached';
    end if;
  end if;

  if target_item.limit_season is not null then
    select count(*)
    into season_count
    from public.purchases
    where student_id = student_row.id
      and item_id = target_item.id
      and status in ('pending', 'approved');

    if season_count >= target_item.limit_season then
      raise exception 'season purchase limit reached';
    end if;
  end if;

  available_points := public.student_available_balance(student_row.id);
  if available_points < target_item.price then
    raise exception 'insufficient points';
  end if;

  insert into public.purchases (
    room_id,
    student_id,
    item_id,
    price_paid,
    status
  )
  values (
    student_row.room_id,
    student_row.id,
    target_item.id,
    target_item.price,
    case when target_item.needs_approval then 'pending'::public.purchase_status
         else 'approved'::public.purchase_status end
  )
  returning * into created_purchase;

  if created_purchase.status = 'approved' then
    update public.purchases
    set decided_at = now()
    where id = created_purchase.id
    returning * into created_purchase;
  end if;

  return created_purchase;
end;
$$;

revoke all on function public.request_purchase(uuid) from public;
grant execute on function public.request_purchase(uuid) to authenticated;
