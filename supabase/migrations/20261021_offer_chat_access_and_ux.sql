-- 21.10.26: Gruppen-Chat eines Angebots nur für die Gruppe
-- Bewohner verwalten Angebote weiter (offer_access_as bleibt unverändert),
-- den Chat, die Dateien und den Lesestand sehen aber nur:
--   * der Eigentümer des Kommunen-Profils (owner_id) als Organisator
--   * Personen mit Status 'angenommen' in offer_interest (auch Bewohner, wenn sie sich selbst freischalten)

create or replace function public.offer_chat_access_as(p_offer uuid, p_as uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.is_early_access()
     and p_as is not null and public.owns_profile(p_as)
     and (
       exists (select 1 from public.offers o join public.profiles k on k.id = o.kommune_id
               where o.id = p_offer and k.owner_id = auth.uid())
       or exists (select 1 from public.offer_interest i
                  where i.offer_id = p_offer and i.user_id = auth.uid() and i.status = 'angenommen')
     );
$$;

create or replace function public.offer_chat_access(p_offer uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select public.is_early_access()
     and (
       exists (select 1 from public.offers o join public.profiles k on k.id = o.kommune_id
               where o.id = p_offer and k.owner_id = auth.uid())
       or exists (select 1 from public.offer_interest i
                  where i.offer_id = p_offer and i.user_id = auth.uid() and i.status = 'angenommen')
     );
$$;

-- Alte Lese-Funktionen: neue Zugriffsregel + die LETZTEN 300 statt der ersten 300
create or replace function public.offer_chat_messages(p_offer uuid)
returns table(id uuid, sender_name text, mine boolean, from_kommune boolean, body text, created_at timestamptz)
language sql stable security definer set search_path to 'public' as $$
  select * from (
    select m.id, p.name, m.sender_user_id = auth.uid(), p.typ = 'kommune', m.body, m.created_at
    from public.offer_messages m join public.profiles p on p.id = m.sender_profile_id
    where m.offer_id = p_offer and public.offer_chat_access(p_offer)
    order by m.created_at desc limit 300
  ) x order by x.created_at;
$$;

create or replace function public.offer_chat_messages(p_offer uuid, p_as uuid)
returns table(id uuid, sender_name text, mine boolean, from_kommune boolean, body text, created_at timestamptz)
language sql stable security definer set search_path to 'public' as $$
  select * from (
    select m.id, p.name, m.sender_profile_id = p_as, p.typ = 'kommune', m.body, m.created_at
    from public.offer_messages m join public.profiles p on p.id = m.sender_profile_id
    where m.offer_id = p_offer and public.offer_chat_access_as(p_offer, p_as)
    order by m.created_at desc limit 300
  ) x order by x.created_at;
$$;

-- Neu: seitenweises Laden. Ohne p_before die neuesten p_limit, sonst die p_limit davor.
create or replace function public.offer_chat_page(p_offer uuid, p_as uuid, p_before timestamptz default null, p_limit int default 50)
returns table(id uuid, sender_name text, mine boolean, from_kommune boolean, body text, created_at timestamptz)
language sql stable security definer set search_path to 'public' as $$
  select * from (
    select m.id, p.name, m.sender_profile_id = p_as, p.typ = 'kommune', m.body, m.created_at
    from public.offer_messages m join public.profiles p on p.id = m.sender_profile_id
    where m.offer_id = p_offer and public.offer_chat_access_as(p_offer, p_as)
      and (p_before is null or m.created_at < p_before)
    order by m.created_at desc limit least(greatest(coalesce(p_limit, 50), 1), 200)
  ) x order by x.created_at;
$$;

-- Senden: gleiche Regel wie Lesen
create or replace function public.send_offer_message(p_offer uuid, p_body text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_sender uuid; v_body text := btrim(coalesce(p_body,''));
begin
  if not public.offer_chat_access(p_offer) then raise exception 'Nicht erlaubt'; end if;
  if v_body = '' or char_length(v_body) > 2000 then raise exception 'Ungültige Nachricht'; end if;
  if (select count(*) from public.offer_messages where sender_user_id = auth.uid() and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Zu viele Nachrichten';
  end if;
  if exists (select 1 from public.offer_interest i where i.offer_id = p_offer and i.user_id = auth.uid() and i.status = 'angenommen') then
    v_sender := auth.uid();
  else
    select kommune_id into v_sender from public.offers where id = p_offer;
  end if;
  insert into public.offer_messages(offer_id, sender_user_id, sender_profile_id, body) values (p_offer, auth.uid(), v_sender, v_body);
end $$;

create or replace function public.send_offer_message(p_offer uuid, p_body text, p_as uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_body text := btrim(coalesce(p_body,''));
begin
  if not public.offer_chat_access_as(p_offer, p_as) then raise exception 'Nicht erlaubt'; end if;
  if v_body = '' or char_length(v_body) > 2000 then raise exception 'Ungültige Nachricht'; end if;
  if (select count(*) from public.offer_messages where sender_user_id = auth.uid() and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Zu viele Nachrichten';
  end if;
  insert into public.offer_messages(offer_id, sender_user_id, sender_profile_id, body) values (p_offer, auth.uid(), p_as, v_body);
end $$;

-- Lesestand pro Person und Angebot (für die "Neu"-Linie)
create table if not exists public.offer_chat_reads (
  offer_id uuid not null references public.offers(id) on delete cascade,
  user_id uuid not null,
  last_read_at timestamptz not null default now(),
  primary key (offer_id, user_id)
);
alter table public.offer_chat_reads enable row level security;
revoke all on public.offer_chat_reads from anon, authenticated;

create or replace function public.offer_chat_last_read(p_offer uuid)
returns timestamptz language sql stable security definer set search_path to 'public' as $$
  select last_read_at from public.offer_chat_reads where offer_id = p_offer and user_id = auth.uid() and public.offer_chat_access(p_offer);
$$;

create or replace function public.offer_chat_mark_read(p_offer uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.offer_chat_access(p_offer) then return; end if;
  insert into public.offer_chat_reads(offer_id, user_id, last_read_at) values (p_offer, auth.uid(), now())
  on conflict (offer_id, user_id) do update set last_read_at = excluded.last_read_at;
end $$;

-- offer_interest_info: zusätzlich Flag 'chat', damit die Seite weiß, ob der Chat-Reiter offen ist
create or replace function public.offer_interest_info(p_offer uuid, p_as uuid)
returns json language plpgsql stable security definer set search_path to 'public' as $$
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
    'chat', coalesce(public.offer_chat_access_as(p_offer, p_as), false),
    'my_anreise', case when v_has then v_mine.anreise end, 'my_abreise', case when v_has then v_mine.abreise end,
    'requests', coalesce(v_req, '[]'::json), 'participants', coalesce(v_part, '[]'::json));
end $$;

-- Dateien pro Angebot: privater Bucket, Pfad <offer_id>/<datei>, nur für die Gruppe
insert into storage.buckets (id, name, public, file_size_limit)
values ('angebot-dateien', 'angebot-dateien', false, 26214400)
on conflict (id) do nothing;

create table if not exists public.offer_files (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  uploader_user_id uuid not null default auth.uid(),
  uploader_profile_id uuid not null,
  name text not null check (char_length(name) between 1 and 200),
  pfad text not null unique,
  groesse bigint,
  mime text,
  created_at timestamptz not null default now()
);
alter table public.offer_files enable row level security;
revoke all on public.offer_files from anon;
grant select, insert, delete on public.offer_files to authenticated;

create policy offer_files_select on public.offer_files for select using (public.offer_chat_access(offer_id));
create policy offer_files_insert on public.offer_files for insert with check (
  public.offer_chat_access(offer_id) and uploader_user_id = auth.uid() and public.owns_profile(uploader_profile_id)
  and pfad like offer_id::text || '/%');
create policy offer_files_delete on public.offer_files for delete using (
  public.offer_chat_access(offer_id) and (uploader_user_id = auth.uid()
    or exists (select 1 from public.offers o join public.profiles k on k.id = o.kommune_id where o.id = offer_id and k.owner_id = auth.uid())));

create or replace function public.storage_offer_id(p_name text)
returns uuid language plpgsql immutable as $$
begin
  return split_part(p_name, '/', 1)::uuid;
exception when others then return null;
end $$;

create policy angebot_dateien_select on storage.objects for select using (
  bucket_id = 'angebot-dateien' and public.storage_offer_id(name) is not null and public.offer_chat_access(public.storage_offer_id(name)));
create policy angebot_dateien_insert on storage.objects for insert with check (
  bucket_id = 'angebot-dateien' and public.storage_offer_id(name) is not null and public.offer_chat_access(public.storage_offer_id(name)));
create policy angebot_dateien_delete on storage.objects for delete using (
  bucket_id = 'angebot-dateien' and public.storage_offer_id(name) is not null and public.offer_chat_access(public.storage_offer_id(name))
  and (owner = auth.uid() or exists (select 1 from public.offers o join public.profiles k on k.id = o.kommune_id
       where o.id = public.storage_offer_id(name) and k.owner_id = auth.uid())));
