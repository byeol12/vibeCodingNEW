-- Joker ledger: earn/use/refund events + shop effect + award sync RPCs.

create type public.joker_source as enum (
  'homework_streak',
  'perfect_week',
  'shop',
  'session_use',
  'manual'
);

alter table public.shop_items
  add column if not exists effect text
  check (effect is null or effect in ('joker'));

update public.shop_items
set effect = 'joker'
where effect is null
  and (name = '조커 카드' or icon = '🃏');

create table public.joker_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  student_id uuid not null,
  delta smallint not null check (delta in (-1, 1)),
  source public.joker_source not null,
  session_id uuid,
  purchase_id uuid,
  week_key text,
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  foreign key (student_id, room_id)
    references public.students(id, room_id) on delete cascade,
  foreign key (session_id, room_id)
    references public.sessions(id, room_id) on delete cascade,
  foreign key (purchase_id)
    references public.purchases(id) on delete set null,
  check (
    (source = 'homework_streak' and session_id is not null and delta = 1)
    or (source = 'perfect_week' and week_key is not null and delta = 1)
    or (source = 'shop' and purchase_id is not null and delta = 1)
    or (source = 'session_use' and session_id is not null)
    or (source = 'manual')
  )
);

create unique index joker_events_homework_uniq
  on public.joker_events (student_id, session_id)
  where source = 'homework_streak';

create unique index joker_events_perfect_week_uniq
  on public.joker_events (student_id, week_key)
  where source = 'perfect_week';

create unique index joker_events_shop_uniq
  on public.joker_events (purchase_id)
  where source = 'shop' and purchase_id is not null;

create unique index joker_events_use_uniq
  on public.joker_events (student_id, session_id)
  where source = 'session_use' and delta = -1;

create index joker_events_student_idx
  on public.joker_events (student_id, created_at);

grant select on public.joker_events to authenticated;

alter table public.joker_events enable row level security;

create policy "teachers read joker events"
on public.joker_events for select
to authenticated
using (public.is_room_teacher(room_id));

create policy "students read own joker events"
on public.joker_events for select
to authenticated
using (
  public.is_active_room_student(room_id)
  and student_id = public.current_student_id(room_id)
);

create or replace function public.student_joker_balance(p_student_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(delta), 0)::integer
  from public.joker_events
  where student_id = p_student_id;
$$;

revoke all on function public.student_joker_balance(uuid) from public;
grant execute on function public.student_joker_balance(uuid) to authenticated;

create or replace function public.grant_joker_from_purchase()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_effect text;
begin
  if new.status is distinct from 'approved' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'approved' then
    return new;
  end if;

  select effect into item_effect
  from public.shop_items
  where id = new.item_id;

  if item_effect is distinct from 'joker' then
    return new;
  end if;

  insert into public.joker_events (
    room_id, student_id, delta, source, purchase_id, note, created_by
  )
  values (
    new.room_id,
    new.student_id,
    1,
    'shop',
    new.id,
    '상점 조커 구매',
    new.decided_by
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists purchases_grant_joker on public.purchases;
create trigger purchases_grant_joker
after insert or update of status on public.purchases
for each row execute function public.grant_joker_from_purchase();

create or replace function public.sync_joker_awards(p_student_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  student_row public.students;
  today_date date := (timezone('Asia/Seoul', now()))::date;
  session_row public.sessions;
  eval_row public.evaluations;
  run_count integer := 0;
  run_month integer := null;
  awarded integer := 0;
  week_key text;
  week_complete boolean;
  incomplete_count integer;
begin
  select * into student_row
  from public.students
  where id = p_student_id
    and status = 'active';

  if student_row.id is null then
    raise exception 'active student required';
  end if;

  if not (
    public.is_room_teacher(student_row.room_id)
    or student_row.auth_user_id = auth.uid()
  ) then
    raise exception 'not allowed';
  end if;

  for session_row in
    select *
    from public.sessions
    where room_id = student_row.room_id
      and session_date <= today_date
    order by session_date
  loop
    select * into eval_row
    from public.evaluations
    where student_id = student_row.id
      and session_id = session_row.id;

    if eval_row.id is null
       or (
         not eval_row.joker_used
         and not eval_row.attitude
         and not eval_row.participation
         and not eval_row.homework
       ) then
      continue;
    end if;

    if run_month is distinct from extract(month from session_row.session_date)::integer then
      run_count := 0;
      run_month := extract(month from session_row.session_date)::integer;
    end if;

    if eval_row.homework or eval_row.joker_used then
      run_count := run_count + 1;
      if run_count % 3 = 0 then
        insert into public.joker_events (
          room_id, student_id, delta, source, session_id, note, created_by
        )
        values (
          student_row.room_id,
          student_row.id,
          1,
          'homework_streak',
          session_row.id,
          '숙제 3연속 조커',
          auth.uid()
        )
        on conflict do nothing;
        if found then
          awarded := awarded + 1;
        end if;
      end if;
    else
      run_count := 0;
    end if;
  end loop;

  for week_key in
    select to_char(date_trunc('week', s.session_date::timestamp), 'IYYY-"W"IW')
    from public.sessions s
    where s.room_id = student_row.room_id
      and s.session_date <= today_date
    group by 1
  loop
    select
      bool_and(
        e.joker_used
        or (e.attitude and e.participation and e.homework)
      ),
      count(*) filter (
        where e.id is null
           or (
             not e.joker_used
             and not (e.attitude and e.participation and e.homework)
           )
      )
    into week_complete, incomplete_count
    from public.sessions s
    left join public.evaluations e
      on e.session_id = s.id
     and e.student_id = student_row.id
    where s.room_id = student_row.room_id
      and s.session_date <= today_date
      and to_char(date_trunc('week', s.session_date::timestamp), 'IYYY-"W"IW') = week_key;

    if coalesce(week_complete, false) and coalesce(incomplete_count, 1) = 0 then
      insert into public.joker_events (
        room_id, student_id, delta, source, week_key, note, created_by
      )
      values (
        student_row.room_id,
        student_row.id,
        1,
        'perfect_week',
        week_key,
        '퍼펙트 위크 조커',
        auth.uid()
      )
      on conflict do nothing;
      if found then
        awarded := awarded + 1;
      end if;
    end if;
  end loop;

  return awarded;
end;
$$;

revoke all on function public.sync_joker_awards(uuid) from public;
grant execute on function public.sync_joker_awards(uuid) to authenticated;

create or replace function public.apply_joker(p_session_id uuid, p_student_id uuid)
returns public.evaluations
language plpgsql
security definer
set search_path = ''
as $$
declare
  student_row public.students;
  session_row public.sessions;
  eval_row public.evaluations;
  item_count integer;
  today_date date := (timezone('Asia/Seoul', now()))::date;
begin
  select * into student_row
  from public.students
  where id = p_student_id
    and status = 'active'
  for update;

  if student_row.id is null then
    raise exception 'active student required';
  end if;

  if not (
    public.is_room_teacher(student_row.room_id)
    or student_row.auth_user_id = auth.uid()
  ) then
    raise exception 'not allowed';
  end if;

  select * into session_row
  from public.sessions
  where id = p_session_id
    and room_id = student_row.room_id;

  if session_row.id is null then
    raise exception 'session not found';
  end if;

  if session_row.session_date > today_date then
    raise exception 'future session';
  end if;

  select * into eval_row
  from public.evaluations
  where student_id = student_row.id
    and session_id = session_row.id
  for update;

  if eval_row.id is null then
    raise exception 'evaluation required';
  end if;

  if eval_row.joker_used then
    return eval_row;
  end if;

  item_count :=
    eval_row.attitude::integer
    + eval_row.participation::integer
    + eval_row.homework::integer;

  if item_count < 1 or item_count > 2 then
    raise exception 'joker only for partial days';
  end if;

  if public.student_joker_balance(student_row.id) <= 0 then
    raise exception 'no joker available';
  end if;

  insert into public.joker_events (
    room_id, student_id, delta, source, session_id, note, created_by
  )
  values (
    student_row.room_id,
    student_row.id,
    -1,
    'session_use',
    session_row.id,
    '조커 사용',
    auth.uid()
  );

  update public.evaluations
  set joker_used = true,
      updated_at = now()
  where id = eval_row.id
  returning * into eval_row;

  return eval_row;
end;
$$;

revoke all on function public.apply_joker(uuid, uuid) from public;
grant execute on function public.apply_joker(uuid, uuid) to authenticated;

create or replace function public.refund_joker(p_session_id uuid, p_student_id uuid)
returns public.evaluations
language plpgsql
security definer
set search_path = ''
as $$
declare
  student_row public.students;
  eval_row public.evaluations;
begin
  select * into student_row
  from public.students
  where id = p_student_id
    and status = 'active'
  for update;

  if student_row.id is null then
    raise exception 'active student required';
  end if;

  if not public.is_room_teacher(student_row.room_id) then
    raise exception 'teacher required';
  end if;

  select * into eval_row
  from public.evaluations
  where student_id = student_row.id
    and session_id = p_session_id
  for update;

  if eval_row.id is null or not eval_row.joker_used then
    raise exception 'joker not used';
  end if;

  delete from public.joker_events
  where student_id = student_row.id
    and session_id = p_session_id
    and source = 'session_use'
    and delta = -1;

  update public.evaluations
  set joker_used = false,
      updated_at = now()
  where id = eval_row.id
  returning * into eval_row;

  return eval_row;
end;
$$;

revoke all on function public.refund_joker(uuid, uuid) from public;
grant execute on function public.refund_joker(uuid, uuid) to authenticated;

-- Keep seed presets tagged with joker effect.
create or replace function public.seed_default_shop_items(target_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.shop_items where room_id = target_room_id) then
    update public.shop_items
    set effect = 'joker'
    where room_id = target_room_id
      and effect is null
      and (name = '조커 카드' or icon = '🃏');
    return;
  end if;

  insert into public.shop_items (
    room_id, icon, name, description, price, limit_month, limit_season,
    needs_approval, sort_order, effect
  )
  values
    (target_room_id, '🎵', '수업 시작 노래', '수업 시작 전 원하는 노래 1곡 신청', 25, 2, null, true, 1, null),
    (target_room_id, '⏱️', '수업 10분 단축', '오늘 수업을 10분 일찍 마쳐요', 110, null, 2, true, 2, null),
    (target_room_id, '📝', '숙제 1개 면제권', '다음 숙제 중 1개를 면제해요', 80, 1, null, true, 3, null),
    (target_room_id, '🃏', '조커 카드', '보유 조커 카드 +1장', 50, null, null, false, 4, 'joker'),
    (target_room_id, '🪑', '자리 선택권', '다음 1주일 동안 앉고 싶은 자리를 골라요', 40, 1, null, true, 5, null),
    (target_room_id, '🎮', '자유활동 20분', '수업 중 자유활동 시간 20분', 160, null, 1, true, 6, null),
    (target_room_id, '👑', '스페셜 보상', '선생님과 함께 정하는 특별 보상', 280, null, 1, true, 7, null);
end;
$$;
