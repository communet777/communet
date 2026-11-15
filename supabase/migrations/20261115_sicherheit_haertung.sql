-- STAND 15.11.2026: Entwurf, in der Datenbank noch NICHT eingespielt.
-- Communet – Sicherheits-Migration (15.11.2026)

-- =====================================================================
-- 1) Early-Access-Codes: Testcode entfernen, Rateversuche begrenzen
-- =====================================================================

-- 1a) Unbenutzten Testcode löschen
delete from public.invite_codes
 where upper(btrim(code)) = 'COMMUNET2025' and used = false;

-- 1b) Protokoll der Fehlversuche (nur über die Funktionen unten erreichbar)
create table if not exists public.invite_code_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  at timestamptz not null default now()
);
create index if not exists invite_code_attempts_at_idx on public.invite_code_attempts (at);
alter table public.invite_code_attempts enable row level security;
revoke all on public.invite_code_attempts from public, anon, authenticated;

-- Absender-Adresse der Anfrage (so gut sie die Schnittstelle liefert)
create or replace function public.invite_request_ip()
returns text
language plpgsql
stable
set search_path = public
as $$
declare h json;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    h := null;
  end;
  return coalesce(
    nullif(h->>'cf-connecting-ip', ''),
    nullif(h->>'x-real-ip', ''),
    nullif(btrim(split_part(h->>'x-forwarded-for', ',', 1)), ''),
    'unbekannt');
end $$;
revoke all on function public.invite_request_ip() from public, anon, authenticated;

-- Sperre: höchstens 5 Fehlversuche je Absender und 50 insgesamt in 15 Minuten
create or replace function public.invite_attempts_blocked()
returns boolean
language sql
security definer
set search_path = public
as $$
  select (select count(*) from public.invite_code_attempts
           where ip = public.invite_request_ip() and at > now() - interval '15 minutes') >= 5
      or (select count(*) from public.invite_code_attempts
           where at > now() - interval '15 minutes') >= 50;
$$;
revoke all on function public.invite_attempts_blocked() from public, anon, authenticated;

-- 1c) Code-Prüfung mit Begrenzung (Name und Parameter unverändert, Website läuft weiter)
create or replace function public.check_invite_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_ok boolean;
begin
  delete from public.invite_code_attempts where at < now() - interval '1 day';
  if public.invite_attempts_blocked() then
    return false;
  end if;
  select exists (
    select 1 from public.invite_codes
     where upper(btrim(code)) = upper(btrim(p_code)) and used = false
  ) into v_ok;
  if not v_ok then
    insert into public.invite_code_attempts (ip) values (public.invite_request_ip());
  end if;
  return v_ok;
end $$;

-- 1d) Code-Einlösen: nur fürs eigene Konto und mit derselben Begrenzung
--     (bisher konnte ein frisch angelegtes Konto hier unbegrenzt Codes durchprobieren)
create or replace function public.redeem_invite_code(p_code text, p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_hit boolean;
begin
  if auth.uid() is null or p_user is distinct from auth.uid() then
    return false;
  end if;
  if public.invite_attempts_blocked() then
    return false;
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user and u.created_at > now() - interval '30 minutes') then
    return false;
  end if;
  update public.invite_codes set used = true, used_by = p_user
   where upper(btrim(code)) = upper(btrim(p_code)) and used = false;
  get diagnostics v_hit = row_count;
  if v_hit then
    perform set_config('app.trusted', '1', true);
    update public.profiles set early_access = true where id = p_user;
    perform set_config('app.trusted', '', true);
  else
    insert into public.invite_code_attempts (ip) values (public.invite_request_ip());
  end if;
  return v_hit;
end $$;

-- =====================================================================
-- 2) Wasserquellen und Hofläden nur mit Early Access lesbar
--    (Konten ohne Code sehen danach nichts mehr davon)
-- =====================================================================

drop policy if exists "Eingeloggte lesen Wasserquellen" on public.water_sources;
create policy "Early Access liest Wasserquellen" on public.water_sources
  for select to authenticated
  using ((select public.is_early_access()) or (select public.is_admin()));

drop policy if exists "farm_shops_select_authenticated" on public.farm_shops;
create policy "Early Access liest farm_shops" on public.farm_shops
  for select to authenticated
  using ((select public.is_early_access()) or (select public.is_admin()));

drop policy if exists "Eingeloggte lesen farm_shops_fr" on public.farm_shops_fr;
create policy "Early Access liest farm_shops_fr" on public.farm_shops_fr
  for select to authenticated
  using ((select public.is_early_access()) or (select public.is_admin()));

drop policy if exists "Eingeloggte lesen farm_shops_osm" on public.farm_shops_osm;
create policy "Early Access liest farm_shops_osm" on public.farm_shops_osm
  for select to authenticated
  using ((select public.is_early_access()) or (select public.is_admin()));

drop policy if exists "Eingeloggte lesen Qualitaet" on public.farm_quality;
create policy "Early Access liest farm_quality" on public.farm_quality
  for select to authenticated
  using ((select public.is_early_access()) or (select public.is_admin()));

-- =====================================================================
-- 3) Aufräumen
-- =====================================================================

-- 3a) Funktionen mit erhöhten Rechten: Aufruf ohne Login entziehen.
--     Ausgenommen bleiben check_invite_code, kommune_ical_daten und die
--     Hilfsfunktionen, die in Zugriffsregeln stecken (sonst bräche der
--     öffentliche Katalog).
do $$
declare f text;
begin
  foreach f in array array[
    'public.kommune_members_roles(uuid)',
    'public.offer_chat_access_as(uuid, uuid)',
    'public.offer_chat_last_read(uuid)',
    'public.offer_chat_mark_read(uuid)',
    'public.offer_chat_page(uuid, uuid, timestamptz, integer)',
    'public.offer_tasks_list2(uuid, uuid)',
    'public.offer_tasks_list3(uuid, uuid)',
    'public.task_act2(uuid, uuid, text)',
    'public.task_add2(uuid, uuid, text, date)',
    'public.task_add3(uuid, uuid, text, date, text, integer)',
    'public.task_set_tag(uuid, uuid, date)',
    'public.task_set_when(uuid, uuid, date, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;

end $$;

-- 3b) Fester Suchpfad für die drei Funktionen ohne
alter function public.waitlist_guard() set search_path = public;
alter function public.storage_kommune_id(text) set search_path = public;
alter function public.storage_offer_id(text) set search_path = public;

-- 3c) Datei-Uploads begrenzen (gilt nur für neue Uploads)
update storage.buckets
   set file_size_limit = 5242880,                                  -- 5 MB
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/avif']
 where id = 'avatars';
update storage.buckets
   set file_size_limit = 20971520                                  -- 20 MB
 where id = 'kommune-karten';

-- 3d) Profilbilder: Dateiliste nicht mehr für alle abrufbar.
--     Die Bilder selbst bleiben über ihre öffentliche Adresse sichtbar.
drop policy if exists "Public can view avatars" on storage.objects;
create policy "Eigene Avatare auflisten" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (auth.uid())::text = (storage.foldername(name))[1]);

-- 3e) Funktionsfehler: Lösch-Regel für Angebots-Dateien verglich mit dem
--     Kommunen-Namen statt dem Dateinamen
drop policy if exists "angebot_dateien_delete" on storage.objects;
create policy "angebot_dateien_delete" on storage.objects
  for delete to public
  using (
    bucket_id = 'angebot-dateien'
    and public.storage_offer_id(name) is not null
    and public.offer_chat_access(public.storage_offer_id(name))
    and (
      owner = auth.uid()
      or exists (
        select 1
          from public.offers o
          join public.profiles k on k.id = o.kommune_id
         where o.id = public.storage_offer_id(objects.name)
           and k.owner_id = auth.uid()
      )
    )
  );

-- =====================================================================
-- 4) Nachtrag: Website-Feld im Profil nur mit http(s)-Adresse
--    (verhindert Skript-Adressen wie "javascript:..." hinter dem
--    Website-Link; alle bestehenden Einträge erfüllen die Regel)
-- =====================================================================

alter table public.profiles
  add constraint profiles_website_http
  check (website is null or website = '' or website ~* '^https?://[^\s]+$');
