create function public.is_room_teacher(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.rooms
    where id = target_room_id and teacher_id = auth.uid()
  );
$$;

create function public.is_active_room_student(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.students
    where room_id = target_room_id
      and auth_user_id = auth.uid()
      and status = 'active'
  );
$$;

create function public.current_student_id(target_room_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id
  from public.students
  where room_id = target_room_id
    and auth_user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

revoke all on function public.is_room_teacher(uuid) from public;
revoke all on function public.is_active_room_student(uuid) from public;
revoke all on function public.current_student_id(uuid) from public;
grant execute on function public.is_room_teacher(uuid) to authenticated;
grant execute on function public.is_active_room_student(uuid) to authenticated;
grant execute on function public.current_student_id(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.students enable row level security;
alter table public.sessions enable row level security;
alter table public.evaluations enable row level security;
alter table public.reflections enable row level security;
alter table public.weekly_reflections enable row level security;
alter table public.shop_items enable row level security;
alter table public.purchases enable row level security;
alter table public.card_arts enable row level security;

create policy "teachers read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "teachers create own profile"
on public.profiles for insert
to authenticated
with check (
  id = auth.uid()
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

create policy "teachers update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "teachers create rooms"
on public.rooms for insert
to authenticated
with check (teacher_id = auth.uid());

create policy "room members read rooms"
on public.rooms for select
to authenticated
using (
  teacher_id = auth.uid()
  or public.is_active_room_student(id)
);

create policy "teachers update rooms"
on public.rooms for update
to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());

create policy "teachers delete rooms"
on public.rooms for delete
to authenticated
using (teacher_id = auth.uid());

create policy "teachers manage students"
on public.students for all
to authenticated
using (public.is_room_teacher(room_id))
with check (public.is_room_teacher(room_id));

create policy "students read self"
on public.students for select
to authenticated
using (auth_user_id = auth.uid());

create policy "teachers manage sessions"
on public.sessions for all
to authenticated
using (public.is_room_teacher(room_id))
with check (public.is_room_teacher(room_id));

create policy "active students read sessions"
on public.sessions for select
to authenticated
using (public.is_active_room_student(room_id));

create policy "teachers manage evaluations"
on public.evaluations for all
to authenticated
using (public.is_room_teacher(room_id))
with check (
  public.is_room_teacher(room_id)
  and evaluated_by = auth.uid()
);

create policy "students read own evaluations"
on public.evaluations for select
to authenticated
using (
  public.is_active_room_student(room_id)
  and student_id = public.current_student_id(room_id)
);

create policy "teachers read reflections"
on public.reflections for select
to authenticated
using (public.is_room_teacher(room_id));

create policy "students read own reflections"
on public.reflections for select
to authenticated
using (
  public.is_active_room_student(room_id)
  and student_id = public.current_student_id(room_id)
);

create policy "students create own reflections"
on public.reflections for insert
to authenticated
with check (
  public.is_active_room_student(room_id)
  and student_id = public.current_student_id(room_id)
);

create policy "students update own reflections"
on public.reflections for update
to authenticated
using (
  public.is_active_room_student(room_id)
  and student_id = public.current_student_id(room_id)
)
with check (
  public.is_active_room_student(room_id)
  and student_id = public.current_student_id(room_id)
);

create policy "teachers read weekly reflections"
on public.weekly_reflections for select
to authenticated
using (public.is_room_teacher(room_id));

create policy "students manage own weekly reflections"
on public.weekly_reflections for all
to authenticated
using (
  public.is_active_room_student(room_id)
  and student_id = public.current_student_id(room_id)
)
with check (
  public.is_active_room_student(room_id)
  and student_id = public.current_student_id(room_id)
);

create policy "teachers manage shop items"
on public.shop_items for all
to authenticated
using (public.is_room_teacher(room_id))
with check (public.is_room_teacher(room_id));

create policy "students read active shop items"
on public.shop_items for select
to authenticated
using (is_active and public.is_active_room_student(room_id));

create policy "teachers read purchases"
on public.purchases for select
to authenticated
using (public.is_room_teacher(room_id));

create policy "teachers decide purchases"
on public.purchases for update
to authenticated
using (public.is_room_teacher(room_id))
with check (
  public.is_room_teacher(room_id)
  and status <> 'pending'
  and decided_by = auth.uid()
  and decided_at is not null
);

create policy "students read own purchases"
on public.purchases for select
to authenticated
using (
  public.is_active_room_student(room_id)
  and student_id = public.current_student_id(room_id)
);

create policy "teachers manage card art metadata"
on public.card_arts for all
to authenticated
using (public.is_room_teacher(room_id))
with check (public.is_room_teacher(room_id));

create policy "students read card art metadata"
on public.card_arts for select
to authenticated
using (public.is_active_room_student(room_id));

create function public.join_room(p_join_code text, p_name text)
returns public.students
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_room public.rooms;
  joined_student public.students;
  existing_student public.students;
begin
  if auth.uid() is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false then
    raise exception 'anonymous student session required';
  end if;

  if char_length(trim(p_name)) not between 1 and 40 then
    raise exception 'invalid student name';
  end if;

  select *
  into target_room
  from public.rooms
  where join_code = upper(trim(p_join_code))
    and (code_expires_at is null or code_expires_at > now());

  if target_room.id is null then
    raise exception 'invalid or expired room code';
  end if;

  select *
  into existing_student
  from public.students
  where auth_user_id = auth.uid();

  if existing_student.id is not null and existing_student.room_id <> target_room.id then
    raise exception 'student session already belongs to another room';
  end if;

  insert into public.students (room_id, auth_user_id, name)
  values (target_room.id, auth.uid(), trim(p_name))
  on conflict (auth_user_id) do update
    set name = excluded.name,
        updated_at = now()
  returning * into joined_student;

  return joined_student;
end;
$$;

revoke all on function public.join_room(text, text) from public;
grant execute on function public.join_room(text, text) to authenticated;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.evaluation_points to authenticated;

revoke all on all tables in schema public from anon;

insert into storage.buckets (id, name, public)
values ('card-art', 'card-art', false)
on conflict (id) do update set public = false;

create function public.storage_room_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return split_part(object_name, '/', 1)::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create policy "room members read card art files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'card-art'
  and (
    public.is_room_teacher(public.storage_room_id(name))
    or public.is_active_room_student(public.storage_room_id(name))
  )
);

create policy "teachers upload card art files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'card-art'
  and public.is_room_teacher(public.storage_room_id(name))
);

create policy "teachers update card art files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'card-art'
  and public.is_room_teacher(public.storage_room_id(name))
)
with check (
  bucket_id = 'card-art'
  and public.is_room_teacher(public.storage_room_id(name))
);

create policy "teachers delete card art files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'card-art'
  and public.is_room_teacher(public.storage_room_id(name))
);
