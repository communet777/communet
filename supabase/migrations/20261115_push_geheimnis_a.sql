-- STAND 15.11.2026: Entwurf, in der Datenbank noch NICHT eingespielt.
-- Push-Empfänger nur noch für den Server – Teil A (vor dem Deploy einspielen).
--
-- Bisher gaben push_targets, offer_push_targets und member_push_targets die Geräte-Adresse und die
-- Schlüssel des Empfängers an jeden angemeldeten Aufrufer zurück. Neu: "_srv"-Funktionen, die
-- zusätzlich ein Geheimnis verlangen, das nur der Server kennt (Vercel: PUSH_RPC_SECRET).
-- Die Anmeldung des Nutzers wird weiterhin mitgeschickt; die inneren Prüfungen bleiben unverändert.
--
-- Reihenfolge: 1) Teil A einspielen  2) Geheimnis auslesen (SQL-Editor):
--                 select value from private.app_secrets where name = 'push_rpc';
--              3) in Vercel als PUSH_RPC_SECRET eintragen und neu deployen
--              4) Mitteilungen testen  5) Teil B einspielen

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.app_secrets (
  name text primary key,
  value text not null
);
revoke all on private.app_secrets from public, anon, authenticated;

insert into private.app_secrets (name, value)
values ('push_rpc', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (name) do nothing;

create or replace function private.push_secret_ok(p text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p is not null and length(p) >= 32
     and exists (select 1 from private.app_secrets where name = 'push_rpc' and value = p);
$$;
revoke all on function private.push_secret_ok(text) from public, anon, authenticated;

create or replace function public.push_targets_srv(p_secret text, p_conv uuid)
returns table(endpoint text, p256dh text, auth_key text, title text, body text, url text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.push_secret_ok(p_secret) then return; end if;
  return query select * from public.push_targets(p_conv);
end $$;

create or replace function public.offer_push_targets_srv(p_secret text, p_offer uuid, p_as uuid, p_kind text, p_user uuid default null)
returns table(endpoint text, p256dh text, auth_key text, title text, body text, url text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.push_secret_ok(p_secret) then return; end if;
  return query select * from public.offer_push_targets(p_offer, p_as, p_kind, p_user);
end $$;

create or replace function public.member_push_targets_srv(p_secret text, p_kommune uuid, p_user uuid)
returns table(endpoint text, p256dh text, auth_key text, title text, body text, url text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.push_secret_ok(p_secret) then return; end if;
  return query select * from public.member_push_targets(p_kommune, p_user);
end $$;

create or replace function public.drop_push_subscription_srv(p_secret text, p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.push_secret_ok(p_secret) then return; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
end $$;

revoke execute on function public.push_targets_srv(text, uuid) from public, anon;
revoke execute on function public.offer_push_targets_srv(text, uuid, uuid, text, uuid) from public, anon;
revoke execute on function public.member_push_targets_srv(text, uuid, uuid) from public, anon;
revoke execute on function public.drop_push_subscription_srv(text, text) from public, anon;
grant execute on function public.push_targets_srv(text, uuid) to authenticated;
grant execute on function public.offer_push_targets_srv(text, uuid, uuid, text, uuid) to authenticated;
grant execute on function public.member_push_targets_srv(text, uuid, uuid) to authenticated;
grant execute on function public.drop_push_subscription_srv(text, text) to authenticated;
