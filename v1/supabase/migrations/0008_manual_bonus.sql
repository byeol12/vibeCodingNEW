-- Allow teachers to award manual bonus points from the room UI.

grant insert on public.bonus_events to authenticated;

create policy "teachers insert manual bonus events"
on public.bonus_events for insert
to authenticated
with check (
  public.is_room_teacher(room_id)
  and kind = 'manual'
  and points > 0
  and points <= 100
);
