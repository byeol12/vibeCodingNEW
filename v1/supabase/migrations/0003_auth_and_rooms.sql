create function public.handle_new_teacher_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
begin
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;

  profile_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    '선생님'
  );

  insert into public.profiles (id, display_name)
  values (new.id, left(profile_name, 80))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_teacher_profile on auth.users;
create trigger on_auth_user_created_teacher_profile
after insert on auth.users
for each row execute function public.handle_new_teacher_profile();

insert into public.profiles (id, display_name)
select
  id,
  left(
    coalesce(
      nullif(trim(raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(email, ''), '@', 1), ''),
      '선생님'
    ),
    80
  )
from auth.users
where coalesce(is_anonymous, false) = false
on conflict (id) do nothing;

create function public.make_join_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32)::integer + 1, 1),
    ''
  )
  from generate_series(1, 6);
$$;

revoke all on function public.make_join_code() from public;

create function public.create_room_with_sessions(
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

  return created_room;
end;
$$;

revoke all on function public.create_room_with_sessions(
  text,
  smallint[],
  date,
  date
) from public;
grant execute on function public.create_room_with_sessions(
  text,
  smallint[],
  date,
  date
) to authenticated;
