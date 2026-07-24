create or replace function public.seed_default_shop_items(target_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.shop_items where room_id = target_room_id) then
    return;
  end if;

  insert into public.shop_items (
    room_id, icon, name, description, price, limit_month, limit_season, needs_approval, sort_order
  )
  values
    (target_room_id, '🎵', '수업 시작 노래', '수업 시작 전 원하는 노래 1곡 신청', 25, 2, null, true, 1),
    (target_room_id, '⏱️', '수업 10분 단축', '오늘 수업을 10분 일찍 마쳐요', 110, null, 2, true, 2),
    (target_room_id, '📝', '숙제 1개 면제권', '다음 숙제 중 1개를 면제해요', 80, 1, null, true, 3),
    (target_room_id, '🃏', '조커 카드', '보유 조커 카드 +1장', 50, null, null, false, 4),
    (target_room_id, '🪑', '자리 선택권', '다음 1주일 동안 앉고 싶은 자리를 골라요', 40, 1, null, true, 5),
    (target_room_id, '🎮', '자유활동 20분', '수업 중 자유활동 시간 20분', 160, null, 1, true, 6),
    (target_room_id, '👑', '스페셜 보상', '선생님과 함께 정하는 특별 보상', 280, null, 1, true, 7);
end;
$$;

revoke all on function public.seed_default_shop_items(uuid) from public;
grant execute on function public.seed_default_shop_items(uuid) to authenticated;

create or replace function public.create_room_with_sessions(
  p_title text,
  p_weekdays smallint[],
  p_start_date date,
  p_end_date date
)
returns public.rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_room public.rooms;
  generated_code text;
  attempts integer := 0;
begin
  if auth.uid() is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'teacher session required';
  end if;

  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'teacher profile required';
  end if;

  if char_length(trim(p_title)) not between 1 and 100 then
    raise exception 'invalid room title';
  end if;

  if p_end_date < p_start_date or p_end_date > p_start_date + 730 then
    raise exception 'invalid program dates';
  end if;

  if cardinality(p_weekdays) not between 1 and 7
     or not p_weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[] then
    raise exception 'invalid weekdays';
  end if;

  loop
    attempts := attempts + 1;
    generated_code := public.make_join_code();
    exit when not exists (
      select 1 from public.rooms where join_code = generated_code
    );
    if attempts >= 20 then
      raise exception 'could not generate join code';
    end if;
  end loop;

  insert into public.rooms (
    teacher_id,
    title,
    join_code,
    code_expires_at,
    weekdays,
    start_date,
    end_date
  )
  values (
    auth.uid(),
    trim(p_title),
    generated_code,
    now() + interval '14 days',
    (
      select array_agg(distinct day order by day)
      from unnest(p_weekdays) as weekdays(day)
    ),
    p_start_date,
    p_end_date
  )
  returning * into created_room;

  insert into public.sessions (room_id, session_date, week_no, weekday)
  select
    created_room.id,
    eligible.session_date,
    dense_rank() over (
      partition by date_trunc('month', eligible.session_date)
      order by date_trunc('week', eligible.session_date)
    )::integer,
    extract(dow from eligible.session_date)::smallint
  from (
    select day::date as session_date
    from generate_series(
      p_start_date::timestamp,
      p_end_date::timestamp,
      interval '1 day'
    ) as day
    where extract(dow from day)::smallint = any(p_weekdays)
  ) as eligible;

  perform public.seed_default_shop_items(created_room.id);
  return created_room;
end;
$$;

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
  limit 1;

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

do $$
declare
  room_row public.rooms;
begin
  for room_row in select * from public.rooms loop
    perform public.seed_default_shop_items(room_row.id);
  end loop;
end;
$$;
