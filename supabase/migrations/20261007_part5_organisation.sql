-- Communet: Angebots-Organisation (Mitbring-Liste, Aufgaben, Zeitplan, Ankündigung, Anreise/Abreise, Push-Empfänger)
-- Im Supabase-Dashboard: SQL Editor -> New query -> alles einfügen -> Run. (Darf auch ein zweites Mal ausgeführt werden.)
begin;

alter table public.offers
  add column if not exists stunden_pro_tag text,
  add column if not exists plaetze int,
  add column if not exists mindestdauer text,
  add column if not exists hausregeln text,
  add column if not exists ankuendigung text,
  add column if not exists ankuendigung_at timestamptz,
  add column if not exists essen_modus text;

alter table public.offer_interest
  add column if not exists anreise date,
  add column if not exists abreise date;

create table if not exists public.offer_dishes (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  category text not null default 'Sonstiges' check (char_length(category) between 1 and 40),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  tags text[] not null default '{}',
  note text check (note is null or char_length(note) <= 200),
  wish boolean not null default false,
  claimed_by uuid references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
drop index if exists public.offer_dishes_unique_name;
alter table public.offer_dishes enable row level security;
revoke all on public.offer_dishes from anon, authenticated;

create table if not exists public.offer_tasks (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  assignee uuid references auth.users(id) on delete set null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.offer_tasks enable row level security;
revoke all on public.offer_tasks from anon, authenticated;

create table if not exists public.offer_schedule (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  tag date,
  uhrzeit time,
  titel text not null check (char_length(btrim(titel)) between 1 and 120),
  beschreibung text check (beschreibung is null or char_length(beschreibung) <= 500),
  created_at timestamptz not null default now()
);
alter table public.offer_schedule enable row level security;
revoke all on public.offer_schedule from anon;
grant select, insert, update, delete on public.offer_schedule to authenticated;
drop policy if exists offer_schedule_select on public.offer_schedule;
drop policy if exists offer_schedule_write_ins on public.offer_schedule;
drop policy if exists offer_schedule_write_upd on public.offer_schedule;
drop policy if exists offer_schedule_write_del on public.offer_schedule;
create policy offer_schedule_select on public.offer_schedule for select using (public.offer_access(offer_id) is not null);
create policy offer_schedule_write_ins on public.offer_schedule for insert with check (public.offer_access(offer_id) = 'owner');
create policy offer_schedule_write_upd on public.offer_schedule for update using (public.offer_access(offer_id) = 'owner') with check (public.offer_access(offer_id) = 'owner');
create policy offer_schedule_write_del on public.offer_schedule for delete using (public.offer_access(offer_id) = 'owner');

-- Mitbring-Liste
create or replace function public.offer_dishes_list(p_offer uuid, p_as uuid)
returns table(id uuid, category text, name text, tags text[], note text, wish boolean, claimed_by uuid, claimed_name text, mine boolean)
language sql stable security definer set search_path = public as $$
  select d.id, d.category, d.name, d.tags, d.note, d.wish, d.claimed_by, p.name, d.claimed_by = auth.uid()
  from public.offer_dishes d left join public.profiles p on p.id = d.claimed_by
  where d.offer_id = p_offer and public.offer_access_as(p_offer, p_as) is not null
  order by d.category, d.created_at;
$$;

create or replace function public.dish_add(p_offer uuid, p_as uuid, p_category text, p_name text, p_tags text[], p_note text, p_wish boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_role text; v_name text := btrim(coalesce(p_name,''));
begin
  v_role := public.offer_access_as(p_offer, p_as);
  if v_role is null then raise exception 'Nicht erlaubt'; end if;
  if p_wish and v_role <> 'owner' then raise exception 'Nur die Kommune kann Wünsche eintragen'; end if;
  if v_name = '' then raise exception 'Bitte einen Namen eintragen'; end if;
  if (select count(*) from public.offer_dishes where offer_id = p_offer) >= 300 then raise exception 'Liste ist voll'; end if;
  insert into public.offer_dishes(offer_id, category, name, tags, note, wish, claimed_by, created_by)
  values (p_offer, coalesce(nullif(btrim(p_category),''),'Sonstiges'), v_name, coalesce(p_tags,'{}'), nullif(btrim(coalesce(p_note,'')),''),
          coalesce(p_wish,false), case when coalesce(p_wish,false) then null else auth.uid() end, auth.uid());
end $$;

create or replace function public.dish_act(p_id uuid, p_as uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
declare d record; v_role text;
begin
  select * into d from public.offer_dishes where id = p_id;
  if not found then raise exception 'Nicht gefunden'; end if;
  v_role := public.offer_access_as(d.offer_id, p_as);
  if v_role is null then raise exception 'Nicht erlaubt'; end if;
  if p_action = 'claim' then
    if d.claimed_by is not null then raise exception 'Schon vergeben'; end if;
    update public.offer_dishes set claimed_by = auth.uid() where id = p_id;
  elsif p_action = 'release' then
    if d.claimed_by is distinct from auth.uid() then raise exception 'Nicht erlaubt'; end if;
    if d.wish then update public.offer_dishes set claimed_by = null where id = p_id;
    else delete from public.offer_dishes where id = p_id; end if;
  elsif p_action = 'delete' then
    if v_role <> 'owner' and not (d.claimed_by = auth.uid() and not d.wish) then raise exception 'Nicht erlaubt'; end if;
    delete from public.offer_dishes where id = p_id;
  else raise exception 'Ungültige Aktion'; end if;
end $$;

-- Aufgaben
create or replace function public.offer_tasks_list(p_offer uuid, p_as uuid)
returns table(id uuid, title text, assignee uuid, assignee_name text, done boolean, mine boolean)
language sql stable security definer set search_path = public as $$
  select t.id, t.title, t.assignee, p.name, t.done, t.assignee = auth.uid()
  from public.offer_tasks t left join public.profiles p on p.id = t.assignee
  where t.offer_id = p_offer and public.offer_access_as(p_offer, p_as) is not null
  order by t.done, t.created_at;
$$;

create or replace function public.task_add(p_offer uuid, p_as uuid, p_title text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.offer_access_as(p_offer, p_as) is distinct from 'owner' then raise exception 'Nicht erlaubt'; end if;
  if (select count(*) from public.offer_tasks where offer_id = p_offer) >= 200 then raise exception 'Liste ist voll'; end if;
  insert into public.offer_tasks(offer_id, title) values (p_offer, btrim(p_title));
end $$;

create or replace function public.task_act(p_id uuid, p_as uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
declare t record; v_role text;
begin
  select * into t from public.offer_tasks where id = p_id;
  if not found then raise exception 'Nicht gefunden'; end if;
  v_role := public.offer_access_as(t.offer_id, p_as);
  if v_role is null then raise exception 'Nicht erlaubt'; end if;
  if p_action = 'take' then
    if t.assignee is not null then raise exception 'Schon vergeben'; end if;
    update public.offer_tasks set assignee = auth.uid() where id = p_id;
  elsif p_action = 'release' then
    if t.assignee is distinct from auth.uid() and v_role <> 'owner' then raise exception 'Nicht erlaubt'; end if;
    update public.offer_tasks set assignee = null where id = p_id;
  elsif p_action = 'toggle' then
    if t.assignee is distinct from auth.uid() and v_role <> 'owner' then raise exception 'Nicht erlaubt'; end if;
    update public.offer_tasks set done = not done where id = p_id;
  elsif p_action = 'delete' then
    if v_role <> 'owner' then raise exception 'Nicht erlaubt'; end if;
    delete from public.offer_tasks where id = p_id;
  else raise exception 'Ungültige Aktion'; end if;
end $$;


-- Mahlzeiten (Gemeinschaftsessen über mehrere Tage)
create table if not exists public.offer_meals (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  tag date not null,
  mahlzeit text not null check (mahlzeit in ('Frühstück','Mittagessen','Abendessen','Sonstiges')),
  titel text check (titel is null or char_length(titel) <= 120),
  created_at timestamptz not null default now(),
  unique (offer_id, tag, mahlzeit)
);
create table if not exists public.offer_meal_cooks (
  meal_id uuid not null references public.offer_meals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meal_id, user_id)
);
alter table public.offer_meals enable row level security;
alter table public.offer_meal_cooks enable row level security;
revoke all on public.offer_meals, public.offer_meal_cooks from anon, authenticated;

create or replace function public.offer_meals_list(p_offer uuid, p_as uuid)
returns table(id uuid, tag date, mahlzeit text, titel text, cooks json, mine boolean)
language sql stable security definer set search_path = public as $$
  select m.id, m.tag, m.mahlzeit, m.titel,
    coalesce((select json_agg(p.name order by c.created_at) from public.offer_meal_cooks c join public.profiles p on p.id = c.user_id where c.meal_id = m.id), '[]'::json),
    exists (select 1 from public.offer_meal_cooks c where c.meal_id = m.id and c.user_id = auth.uid())
  from public.offer_meals m
  where m.offer_id = p_offer and public.offer_access_as(p_offer, p_as) is not null
  order by m.tag, case m.mahlzeit when 'Frühstück' then 1 when 'Mittagessen' then 2 when 'Abendessen' then 3 else 4 end;
$$;

create or replace function public.meals_add(p_offer uuid, p_as uuid, p_von date, p_bis date, p_arten text[])
returns void language plpgsql security definer set search_path = public as $$
declare d date; a text;
begin
  if public.offer_access_as(p_offer, p_as) is distinct from 'owner' then raise exception 'Nicht erlaubt'; end if;
  if p_von is null or p_bis is null or p_bis < p_von or p_bis - p_von > 30 then raise exception 'Bitte einen Zeitraum bis max. 31 Tage wählen'; end if;
  foreach a in array p_arten loop
    if a not in ('Frühstück','Mittagessen','Abendessen','Sonstiges') then raise exception 'Ungültige Mahlzeit'; end if;
    for d in select generate_series(p_von, p_bis, interval '1 day')::date loop
      insert into public.offer_meals(offer_id, tag, mahlzeit) values (p_offer, d, a) on conflict do nothing;
    end loop;
  end loop;
end $$;

create or replace function public.meal_act(p_id uuid, p_as uuid, p_action text, p_titel text default null)
returns void language plpgsql security definer set search_path = public as $$
declare m record; v_role text;
begin
  select * into m from public.offer_meals where id = p_id;
  if not found then raise exception 'Nicht gefunden'; end if;
  v_role := public.offer_access_as(m.offer_id, p_as);
  if v_role is null then raise exception 'Nicht erlaubt'; end if;
  if p_action = 'cook' then
    insert into public.offer_meal_cooks(meal_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  elsif p_action = 'uncook' then
    delete from public.offer_meal_cooks where meal_id = p_id and user_id = auth.uid();
  elsif p_action = 'title' then
    if v_role <> 'owner' and not exists (select 1 from public.offer_meal_cooks where meal_id = p_id and user_id = auth.uid()) then raise exception 'Nicht erlaubt'; end if;
    update public.offer_meals set titel = nullif(btrim(coalesce(p_titel,'')),'') where id = p_id;
  elsif p_action = 'delete' then
    if v_role <> 'owner' then raise exception 'Nicht erlaubt'; end if;
    delete from public.offer_meals where id = p_id;
  else raise exception 'Ungültige Aktion'; end if;
end $$;

-- Mitfahrgelegenheiten
create table if not exists public.offer_rides (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  driver uuid not null references auth.users(id) on delete cascade,
  plaetze int not null check (plaetze between 1 and 8),
  ort text check (ort is null or char_length(ort) <= 80),
  abfahrt timestamp,
  notiz text check (notiz is null or char_length(notiz) <= 200),
  created_at timestamptz not null default now()
);
create table if not exists public.offer_ride_riders (
  ride_id uuid not null references public.offer_rides(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (ride_id, user_id)
);
alter table public.offer_rides enable row level security;
alter table public.offer_ride_riders enable row level security;
revoke all on public.offer_rides, public.offer_ride_riders from anon, authenticated;

create or replace function public.offer_rides_list(p_offer uuid, p_as uuid)
returns table(id uuid, driver_name text, plaetze int, taken int, ort text, abfahrt timestamp, notiz text, riders json, mine boolean, i_ride boolean)
language sql stable security definer set search_path = public as $$
  select r.id, p.name, r.plaetze,
    (select count(*)::int from public.offer_ride_riders x where x.ride_id = r.id), r.ort, r.abfahrt, r.notiz,
    coalesce((select json_agg(pp.name order by x.created_at) from public.offer_ride_riders x join public.profiles pp on pp.id = x.user_id where x.ride_id = r.id), '[]'::json),
    r.driver = auth.uid(),
    exists (select 1 from public.offer_ride_riders x where x.ride_id = r.id and x.user_id = auth.uid())
  from public.offer_rides r join public.profiles p on p.id = r.driver
  where r.offer_id = p_offer and public.offer_access_as(p_offer, p_as) is not null
  order by r.abfahrt nulls last, r.created_at;
$$;

create or replace function public.ride_add(p_offer uuid, p_as uuid, p_plaetze int, p_ort text, p_abfahrt timestamp, p_notiz text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.offer_access_as(p_offer, p_as) is null then raise exception 'Nicht erlaubt'; end if;
  if p_plaetze is null or p_plaetze < 1 or p_plaetze > 8 then raise exception 'Bitte 1–8 freie Plätze angeben'; end if;
  if exists (select 1 from public.offer_rides where offer_id = p_offer and driver = auth.uid()) then raise exception 'Du hast schon ein Auto eingetragen'; end if;
  insert into public.offer_rides(offer_id, driver, plaetze, ort, abfahrt, notiz)
  values (p_offer, auth.uid(), p_plaetze, nullif(btrim(coalesce(p_ort,'')),''), p_abfahrt, nullif(btrim(coalesce(p_notiz,'')),''));
end $$;

create or replace function public.ride_act(p_id uuid, p_as uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
declare r record; v_taken int;
begin
  select * into r from public.offer_rides where id = p_id;
  if not found then raise exception 'Nicht gefunden'; end if;
  if public.offer_access_as(r.offer_id, p_as) is null then raise exception 'Nicht erlaubt'; end if;
  if p_action = 'join' then
    if r.driver = auth.uid() then raise exception 'Das ist dein eigenes Auto'; end if;
    select count(*) into v_taken from public.offer_ride_riders where ride_id = p_id;
    if v_taken >= r.plaetze then raise exception 'Das Auto ist voll'; end if;
    delete from public.offer_ride_riders x using public.offer_rides o where x.ride_id = o.id and o.offer_id = r.offer_id and x.user_id = auth.uid();
    insert into public.offer_ride_riders(ride_id, user_id) values (p_id, auth.uid()) on conflict do nothing;
  elsif p_action = 'leave' then
    delete from public.offer_ride_riders where ride_id = p_id and user_id = auth.uid();
  elsif p_action = 'delete' then
    if r.driver <> auth.uid() and public.offer_access_as(r.offer_id, p_as) <> 'owner' then raise exception 'Nicht erlaubt'; end if;
    delete from public.offer_rides where id = p_id;
  else raise exception 'Ungültige Aktion'; end if;
end $$;

-- Anreise/Abreise der eigenen Anfrage
create or replace function public.offer_set_my_dates(p_offer uuid, p_anreise date, p_abreise date)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.offer_interest set anreise = p_anreise, abreise = p_abreise where offer_id = p_offer and user_id = auth.uid();
end $$;

-- Info inkl. Anreise/Abreise
create or replace function public.offer_interest_info(p_offer uuid, p_as uuid) returns json
language plpgsql stable security definer set search_path = public as $$
declare v_role text; v_mine record; v_count int; v_req json; v_part json; v_has boolean;
begin
  v_role := public.offer_access_as(p_offer, p_as);
  select * into v_mine from public.offer_interest where offer_id = p_offer and user_id = auth.uid();
  v_has := found;
  select count(*) into v_count from public.offer_interest where offer_id = p_offer and status <> 'abgelehnt';
  if v_role = 'owner' then
    select coalesce(json_agg(json_build_object('user_id', i.user_id, 'name', p.name, 'status', i.status, 'anreise', i.anreise, 'abreise', i.abreise) order by i.created_at), '[]'::json)
      into v_req from public.offer_interest i join public.profiles p on p.id = i.user_id where i.offer_id = p_offer;
  end if;
  if v_role in ('owner','participant') then
    select coalesce(json_agg(json_build_object('user_id', i.user_id, 'name', p.name, 'anreise', i.anreise, 'abreise', i.abreise) order by i.created_at), '[]'::json)
      into v_part from public.offer_interest i join public.profiles p on p.id = i.user_id where i.offer_id = p_offer and i.status = 'angenommen';
  end if;
  return json_build_object('count', v_count, 'mine', v_has, 'my_status', case when v_has then v_mine.status end, 'role', v_role,
    'my_anreise', case when v_has then v_mine.anreise end, 'my_abreise', case when v_has then v_mine.abreise end,
    'requests', coalesce(v_req, '[]'::json), 'participants', coalesce(v_part, '[]'::json));
end $$;

-- Push-Empfänger
create or replace function public.offer_push_targets(p_offer uuid, p_as uuid, p_kind text, p_user uuid default null)
returns table(endpoint text, p256dh text, auth_key text, title text, body text, url text)
language plpgsql security definer set search_path = public as $$
declare v_role text; v_title text; v_owner uuid; v_kname text; v_me text; v_ids uuid[]; v_body text; v_ok boolean := false;
begin
  v_role := public.offer_access_as(p_offer, p_as);
  select o.titel, k.owner_id, k.name into v_title, v_owner, v_kname from public.offers o join public.profiles k on k.id = o.kommune_id where o.id = p_offer;
  select name into v_me from public.profiles where id = p_as;
  if p_kind = 'chat' and v_role is not null
     and exists (select 1 from public.offer_messages m where m.offer_id = p_offer and m.sender_user_id = auth.uid() and m.created_at > now() - interval '30 seconds') then
    v_ids := array(select i.user_id from public.offer_interest i where i.offer_id = p_offer and i.status = 'angenommen' union select v_owner);
    v_body := coalesce(v_me,'Jemand') || ' hat im Chat geschrieben'; v_ok := true;
  elsif p_kind = 'accepted' and v_role = 'owner' and exists (select 1 from public.offer_interest i where i.offer_id = p_offer and i.user_id = p_user and i.status = 'angenommen') then
    v_ids := array[p_user]; v_body := 'Du bist dabei! ' || v_kname || ' hat dich freigeschaltet.'; v_ok := true;
  elsif p_kind = 'announce' and v_role = 'owner' and exists (select 1 from public.offers o where o.id = p_offer and o.ankuendigung_at > now() - interval '60 seconds') then
    v_ids := array(select i.user_id from public.offer_interest i where i.offer_id = p_offer and i.status = 'angenommen');
    v_body := 'Neue Ankündigung von ' || v_kname; v_ok := true;
  elsif p_kind = 'request' and exists (select 1 from public.offer_interest i where i.offer_id = p_offer and i.user_id = auth.uid() and i.created_at > now() - interval '60 seconds') then
    v_ids := array[v_owner]; v_body := coalesce(v_me,'Jemand') || ' möchte teilnehmen'; v_ok := true;
  end if;
  if not v_ok then return; end if;
  return query select s.endpoint, s.p256dh, s.auth_key, v_title, v_body, '/angebote/' || p_offer::text
    from public.push_subscriptions s where s.user_id = any(v_ids) and s.user_id <> auth.uid();
end $$;

revoke all on function public.offer_dishes_list(uuid,uuid), public.dish_add(uuid,uuid,text,text,text[],text,boolean), public.dish_act(uuid,uuid,text),
  public.offer_tasks_list(uuid,uuid), public.task_add(uuid,uuid,text), public.task_act(uuid,uuid,text), public.offer_set_my_dates(uuid,date,date),
  public.offer_push_targets(uuid,uuid,text,uuid), public.offer_meals_list(uuid,uuid), public.meals_add(uuid,uuid,date,date,text[]), public.meal_act(uuid,uuid,text,text),
  public.offer_rides_list(uuid,uuid), public.ride_add(uuid,uuid,int,text,timestamp,text), public.ride_act(uuid,uuid,text) from public, anon;
grant execute on function public.offer_dishes_list(uuid,uuid), public.dish_add(uuid,uuid,text,text,text[],text,boolean), public.dish_act(uuid,uuid,text),
  public.offer_tasks_list(uuid,uuid), public.task_add(uuid,uuid,text), public.task_act(uuid,uuid,text), public.offer_set_my_dates(uuid,date,date),
  public.offer_push_targets(uuid,uuid,text,uuid), public.offer_meals_list(uuid,uuid), public.meals_add(uuid,uuid,date,date,text[]), public.meal_act(uuid,uuid,text,text),
  public.offer_rides_list(uuid,uuid), public.ride_add(uuid,uuid,int,text,timestamp,text), public.ride_act(uuid,uuid,text) to authenticated;

commit;
