create extension if not exists pgcrypto;

create type public.student_status as enum ('pending', 'active', 'revoked');
create type public.purchase_status as enum ('pending', 'approved', 'rejected', 'refunded');
create type public.card_grade as enum ('C', 'U', 'R', 'E', 'L', 'J');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  code_expires_at timestamptz,
  weekdays smallint[] not null check (
    cardinality(weekdays) between 1 and 7
    and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  ),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  status public.student_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, room_id)
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  session_date date not null,
  week_no integer not null check (week_no > 0),
  weekday smallint not null check (weekday between 0 and 6),
  created_at timestamptz not null default now(),
  unique (room_id, session_date),
  unique (id, room_id)
);

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  student_id uuid not null,
  session_id uuid not null,
  attitude boolean not null default false,
  participation boolean not null default false,
  homework boolean not null default false,
  is_lucky boolean not null default false,
  joker_used boolean not null default false,
  teacher_memo text not null default '' check (char_length(teacher_memo) <= 1000),
  evaluated_by uuid not null references public.profiles(id),
  evaluated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (student_id, room_id)
    references public.students(id, room_id) on delete cascade,
  foreign key (session_id, room_id)
    references public.sessions(id, room_id) on delete cascade,
  unique (student_id, session_id)
);

create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  student_id uuid not null,
  session_id uuid not null,
  praise_tags text[] not null default '{}'
    check (cardinality(praise_tags) <= 3),
  struggle_tags text[] not null default '{}'
    check (cardinality(struggle_tags) <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (student_id, room_id)
    references public.students(id, room_id) on delete cascade,
  foreign key (session_id, room_id)
    references public.sessions(id, room_id) on delete cascade,
  unique (student_id, session_id)
);

create table public.weekly_reflections (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  student_id uuid not null,
  week_start date not null,
  helpful_factor text not null check (
    helpful_factor in ('sleep', 'planning', 'teacher', 'phone-away')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (student_id, room_id)
    references public.students(id, room_id) on delete cascade,
  unique (student_id, week_start)
);

create table public.shop_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  icon text not null default '🎁' check (char_length(icon) between 1 and 16),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  price integer not null check (price >= 0),
  limit_month integer check (limit_month > 0),
  limit_season integer check (limit_season > 0),
  needs_approval boolean not null default true,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, room_id),
  check (limit_month is null or limit_season is null)
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  student_id uuid not null,
  item_id uuid not null,
  price_paid integer not null check (price_paid >= 0),
  status public.purchase_status not null default 'pending',
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id),
  foreign key (student_id, room_id)
    references public.students(id, room_id) on delete cascade,
  foreign key (item_id, room_id)
    references public.shop_items(id, room_id),
  check (
    (status = 'pending' and decided_at is null and decided_by is null)
    or status <> 'pending'
  )
);

create table public.card_arts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  grade public.card_grade not null,
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, grade)
);

create index rooms_teacher_idx on public.rooms(teacher_id);
create index students_room_idx on public.students(room_id);
create index sessions_room_date_idx on public.sessions(room_id, session_date);
create index evaluations_student_idx on public.evaluations(student_id);
create index reflections_student_idx on public.reflections(student_id);
create index purchases_student_status_idx on public.purchases(student_id, status);
create index purchases_item_requested_idx on public.purchases(item_id, requested_at);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger rooms_set_updated_at before update on public.rooms
for each row execute function public.set_updated_at();
create trigger students_set_updated_at before update on public.students
for each row execute function public.set_updated_at();
create trigger evaluations_set_updated_at before update on public.evaluations
for each row execute function public.set_updated_at();
create trigger reflections_set_updated_at before update on public.reflections
for each row execute function public.set_updated_at();
create trigger weekly_reflections_set_updated_at before update on public.weekly_reflections
for each row execute function public.set_updated_at();
create trigger shop_items_set_updated_at before update on public.shop_items
for each row execute function public.set_updated_at();
create trigger card_arts_set_updated_at before update on public.card_arts
for each row execute function public.set_updated_at();

create view public.evaluation_points
with (security_invoker = true)
as
select
  e.id as evaluation_id,
  e.room_id,
  e.student_id,
  e.session_id,
  (
    e.attitude::integer
    + e.participation::integer
    + e.homework::integer
    + case when e.attitude and e.participation and e.homework then 2 else 0 end
    + case when cardinality(coalesce(r.praise_tags, '{}')) > 0 then 2 else 0 end
    + case
        when e.is_lucky and e.attitude and e.participation and e.homework then 5
        else 0
      end
  )::integer as base_points
from public.evaluations e
left join public.reflections r
  on r.student_id = e.student_id and r.session_id = e.session_id;

comment on view public.evaluation_points is
  'v0의 일일 기본 포인트만 계산한다. 성장·회복 보너스와 구매 잔액은 후속 RPC에서 계산한다.';
