-- Growth (+20) and recovery (+10) bonus ledger; include in purchase balance.

create type public.bonus_kind as enum ('growth', 'recovery', 'manual');

create table public.bonus_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  student_id uuid not null,
  kind public.bonus_kind not null,
  points integer not null check (points > 0),
  month_key text,
  break_session_id uuid,
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  foreign key (student_id, room_id)
    references public.students(id, room_id) on delete cascade,
  foreign key (break_session_id, room_id)
    references public.sessions(id, room_id) on delete cascade,
  check (
    (kind = 'growth' and month_key is not null and points = 20)
    or (kind = 'recovery' and break_session_id is not null and points = 10)
    or (kind = 'manual' and points > 0)
  )
);

create unique index bonus_events_growth_uniq
  on public.bonus_events (student_id, month_key)
  where kind = 'growth';

create unique index bonus_events_recovery_uniq
  on public.bonus_events (student_id, break_session_id)
  where kind = 'recovery';

create index bonus_events_student_idx
  on public.bonus_events (student_id, created_at);

grant select on public.bonus_events to authenticated;

alter table public.bonus_events enable row level security;

create policy "teachers read bonus events"
on public.bonus_events for select
to authenticated
using (public.is_room_teacher(room_id));

create policy "students read own bonus events"
on public.bonus_events for select
to authenticated
using (
  public.is_active_room_student(room_id)
  and student_id = public.current_student_id(room_id)
);

create or replace function public.student_bonus_points(p_student_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(points), 0)::integer
  from public.bonus_events
  where student_id = p_student_id;
$$;

revoke all on function public.student_bonus_points(uuid) from public;
grant execute on function public.student_bonus_points(uuid) to authenticated;

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
  bonuses as (
    select coalesce(sum(b.points), 0)::integer as points
    from public.bonus_events b
    where b.student_id = p_student_id
  ),
  reserved_or_spent as (
    select coalesce(sum(p.price_paid), 0)::integer as points
    from public.purchases p
    where p.student_id = p_student_id
      and p.status in ('pending', 'approved')
  )
  select greatest(
    0,
    (select points from earned)
      + (select points from bonuses)
      - (select points from reserved_or_spent)
  );
$$;

create or replace function public.sync_bonus_awards(p_student_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  student_row public.students;
  today_date date := (timezone('Asia/Seoul', now()))::date;
  awarded integer := 0;
  month_keys text[];
  idx integer;
  prev_key text;
  curr_key text;
  prev_total integer;
  prev_done integer;
  prev_touched boolean;
  curr_total integer;
  curr_done integer;
  curr_touched boolean;
  session_row public.sessions;
  eval_row public.evaluations;
  item_count integer;
  is_done boolean;
  streak integer := 0;
  latest_break_id uuid := null;
  recovery_progress integer := 0;
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

  select coalesce(array_agg(month_key order by month_key), '{}'::text[])
  into month_keys
  from (
    select distinct to_char(s.session_date, 'YYYY-MM') as month_key
    from public.sessions s
    where s.room_id = student_row.room_id
  ) months;

  if cardinality(month_keys) >= 2 then
    for idx in 2 .. cardinality(month_keys) loop
      prev_key := month_keys[idx - 1];
      curr_key := month_keys[idx];

      select
        count(*),
        count(*) filter (
          where e.joker_used
             or (e.attitude and e.participation and e.homework)
        ),
        bool_or(
          e.id is not null
          and (
            e.joker_used
            or e.attitude
            or e.participation
            or e.homework
          )
        )
      into prev_total, prev_done, prev_touched
      from public.sessions s
      left join public.evaluations e
        on e.session_id = s.id
       and e.student_id = student_row.id
      where s.room_id = student_row.room_id
        and to_char(s.session_date, 'YYYY-MM') = prev_key;

      select
        count(*),
        count(*) filter (
          where e.joker_used
             or (e.attitude and e.participation and e.homework)
        ),
        bool_or(
          e.id is not null
          and (
            e.joker_used
            or e.attitude
            or e.participation
            or e.homework
          )
        )
      into curr_total, curr_done, curr_touched
      from public.sessions s
      left join public.evaluations e
        on e.session_id = s.id
       and e.student_id = student_row.id
      where s.room_id = student_row.room_id
        and to_char(s.session_date, 'YYYY-MM') = curr_key;

      if coalesce(prev_touched, false)
         and coalesce(curr_touched, false)
         and prev_total > 0
         and curr_total > 0
         and (curr_done::numeric / curr_total)
             > (prev_done::numeric / prev_total) then
        insert into public.bonus_events (
          room_id, student_id, kind, points, month_key, note, created_by
        )
        values (
          student_row.room_id,
          student_row.id,
          'growth',
          20,
          curr_key,
          curr_key || ' 성장 보너스',
          auth.uid()
        )
        on conflict do nothing;
        if found then
          awarded := awarded + 1;
        end if;
      end if;
    end loop;
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

    if eval_row.id is null then
      continue;
    end if;

    item_count :=
      eval_row.attitude::integer
      + eval_row.participation::integer
      + eval_row.homework::integer;

    if item_count = 0 and not eval_row.joker_used then
      continue;
    end if;

    is_done := eval_row.joker_used
      or (eval_row.attitude and eval_row.participation and eval_row.homework);

    if is_done then
      streak := streak + 1;
      if latest_break_id is not null then
        recovery_progress := recovery_progress + 1;
      end if;
    elsif item_count > 0 then
      if streak > 0 then
        latest_break_id := session_row.id;
        recovery_progress := 0;
      end if;
      streak := 0;
    end if;
  end loop;

  if latest_break_id is not null and recovery_progress >= 3 then
    insert into public.bonus_events (
      room_id, student_id, kind, points, break_session_id, note, created_by
    )
    values (
      student_row.room_id,
      student_row.id,
      'recovery',
      10,
      latest_break_id,
      '3일 회복 보너스',
      auth.uid()
    )
    on conflict do nothing;
    if found then
      awarded := awarded + 1;
    end if;
  end if;

  return awarded;
end;
$$;

revoke all on function public.sync_bonus_awards(uuid) from public;
grant execute on function public.sync_bonus_awards(uuid) to authenticated;
