-- 21.10.26: Mehrere Personen pro Aufgabe + Tageszeit (morgens/mittags/abends)
alter table public.offer_tasks add column if not exists zeit text;
alter table public.offer_tasks drop constraint if exists offer_tasks_zeit_check;
alter table public.offer_tasks add constraint offer_tasks_zeit_check check (zeit is null or zeit in ('morgens','mittags','abends'));
alter table public.offer_tasks add column if not exists anzahl int;
alter table public.offer_tasks drop constraint if exists offer_tasks_anzahl_check;
alter table public.offer_tasks add constraint offer_tasks_anzahl_check check (anzahl is null or anzahl between 1 and 50);

create table if not exists public.offer_task_people (
  task_id uuid not null references public.offer_tasks(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);
alter table public.offer_task_people enable row level security;
revoke all on public.offer_task_people from anon, authenticated;

-- bisherige Einzel-Zuständige übernehmen
insert into public.offer_task_people(task_id, user_id)
select id, assignee from public.offer_tasks where assignee is not null
on conflict do nothing;

create or replace function public.task_add3(p_offer uuid, p_as uuid, p_title text, p_tag date default null, p_zeit text default null, p_anzahl int default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_title text := btrim(coalesce(p_title,''));
begin
  if public.offer_access_as(p_offer, p_as) is null then raise exception 'Nicht erlaubt'; end if;
  if v_title = '' or char_length(v_title) > 120 then raise exception 'Ungültige Aufgabe'; end if;
  if (select count(*) from public.offer_tasks where offer_id = p_offer) >= 200 then raise exception 'Liste ist voll'; end if;
  insert into public.offer_tasks(offer_id, title, tag, zeit, anzahl, created_by)
  values (p_offer, v_title, p_tag, nullif(p_zeit,''), p_anzahl, auth.uid());
end $$;

create or replace function public.offer_tasks_list3(p_offer uuid, p_as uuid)
returns table(id uuid, title text, tag date, zeit text, anzahl int, done boolean, people json, mine boolean, can_edit boolean)
language sql stable security definer set search_path to 'public' as $$
  select t.id, t.title, t.tag, t.zeit, t.anzahl, t.done,
    coalesce((select json_agg(json_build_object('user_id', tp.user_id, 'name', p.name) order by tp.created_at)
              from public.offer_task_people tp join public.profiles p on p.id = tp.user_id where tp.task_id = t.id), '[]'::json),
    exists (select 1 from public.offer_task_people tp where tp.task_id = t.id and tp.user_id = auth.uid()),
    (public.offer_access_as(p_offer, p_as) = 'owner' or t.created_by = auth.uid())
  from public.offer_tasks t
  where t.offer_id = p_offer and public.offer_access_as(p_offer, p_as) is not null
  order by t.done, t.tag nulls last, array_position(array['morgens','mittags','abends'], t.zeit) nulls last, t.created_at;
$$;

-- Aktionen: join / leave / toggle / delete
create or replace function public.task_act2(p_id uuid, p_as uuid, p_action text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare t record; v_role text; v_in boolean;
begin
  select * into t from public.offer_tasks where id = p_id;
  if not found then raise exception 'Nicht gefunden'; end if;
  v_role := public.offer_access_as(t.offer_id, p_as);
  if v_role is null then raise exception 'Nicht erlaubt'; end if;
  v_in := exists (select 1 from public.offer_task_people where task_id = p_id and user_id = auth.uid());
  if p_action = 'join' then
    if t.anzahl is not null and (select count(*) from public.offer_task_people where task_id = p_id) >= t.anzahl then raise exception 'Schon genug Leute dabei'; end if;
    insert into public.offer_task_people(task_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  elsif p_action = 'leave' then
    delete from public.offer_task_people where task_id = p_id and user_id = auth.uid();
  elsif p_action = 'toggle' then
    if not v_in and v_role <> 'owner' then raise exception 'Nicht erlaubt'; end if;
    update public.offer_tasks set done = not done where id = p_id;
  elsif p_action = 'delete' then
    if v_role <> 'owner' and t.created_by is distinct from auth.uid() then raise exception 'Nicht erlaubt'; end if;
    delete from public.offer_tasks where id = p_id;
  else raise exception 'Ungültige Aktion'; end if;
end $$;

create or replace function public.task_set_when(p_id uuid, p_as uuid, p_tag date, p_zeit text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare t record; v_role text;
begin
  select * into t from public.offer_tasks where id = p_id;
  if not found then raise exception 'Nicht gefunden'; end if;
  v_role := public.offer_access_as(t.offer_id, p_as);
  if v_role is null or (v_role <> 'owner' and t.created_by is distinct from auth.uid()) then raise exception 'Nicht erlaubt'; end if;
  update public.offer_tasks set tag = p_tag, zeit = nullif(p_zeit,'') where id = p_id;
end $$;

-- Nachtrag: Verschieben dürfen auch alle, die bei der Aufgabe mitmachen
create or replace function public.task_set_when(p_id uuid, p_as uuid, p_tag date, p_zeit text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare t record; v_role text;
begin
  select * into t from public.offer_tasks where id = p_id;
  if not found then raise exception 'Nicht gefunden'; end if;
  v_role := public.offer_access_as(t.offer_id, p_as);
  if v_role is null then raise exception 'Nicht erlaubt'; end if;
  if v_role <> 'owner' and t.created_by is distinct from auth.uid()
     and not exists (select 1 from public.offer_task_people where task_id = p_id and user_id = auth.uid()) then
    raise exception 'Nicht erlaubt';
  end if;
  update public.offer_tasks set tag = p_tag, zeit = nullif(p_zeit,'') where id = p_id;
end $$;
