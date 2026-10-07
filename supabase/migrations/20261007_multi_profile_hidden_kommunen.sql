-- Communet: mehrere Profile pro Login, versteckte Kommunen, Early-Access-Flag, Personensuche
-- Im Supabase-Dashboard: SQL Editor -> New query -> alles einfügen -> Run.
begin;

alter table public.profiles
  add column if not exists owner_id uuid,
  add column if not exists hidden boolean not null default false,
  add column if not exists early_access boolean not null default false,
  add column if not exists auffindbar boolean not null default true;

update public.profiles set owner_id = id where owner_id is null;
update public.profiles set early_access = true;
alter table public.profiles alter column owner_id set not null;
alter table public.profiles alter column id set default gen_random_uuid();

alter table public.profiles drop constraint profiles_id_fkey;
alter table public.profiles add constraint profiles_owner_fkey foreign key (owner_id) references auth.users(id) on delete cascade;
alter table public.offers drop constraint offers_kommune_id_fkey;
alter table public.offers add constraint offers_kommune_id_fkey foreign key (kommune_id) references public.profiles(id) on delete cascade;
alter table public.events drop constraint events_kommune_id_fkey;
alter table public.events add constraint events_kommune_id_fkey foreign key (kommune_id) references public.profiles(id) on delete cascade;

create table public.kommune_members (
  kommune_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (kommune_id, user_id)
);
alter table public.kommune_members enable row level security;

create or replace function public.owns_profile(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = p_id and owner_id = auth.uid());
$$;
create or replace function public.is_kommune_member(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.kommune_members where kommune_id = p_id and user_id = auth.uid());
$$;
create or replace function public.is_early_access() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select early_access from public.profiles where id = auth.uid()), false);
$$;
create or replace function public.can_see_kommune(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_id and p.typ = 'kommune'
      and (not p.hidden or p.owner_id = auth.uid() or public.is_admin()
           or exists (select 1 from public.kommune_members m where m.kommune_id = p.id and m.user_id = auth.uid()))
  );
$$;

create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if current_user not in ('authenticated','anon') or auth.uid() is null or public.is_admin() then
    if tg_op = 'INSERT' and new.owner_id is null then new.owner_id := new.id; end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.owner_id := auth.uid();
    if new.typ = 'person' then new.id := auth.uid(); end if;
    new.early_access := false;
    new.status := case when new.typ = 'kommune' and not new.hidden then 'pending' else 'approved' end;
  else
    new.id := old.id;
    new.typ := old.typ;
    new.owner_id := old.owner_id;
    new.early_access := old.early_access;
    if new.typ = 'kommune' and new.hidden then
      new.status := 'approved';
    elsif new.typ = 'kommune' and old.hidden and not new.hidden then
      new.status := 'pending';
    else
      new.status := old.status;
    end if;
  end if;
  return new;
end $$;

drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_insert_own on public.profiles for insert
  with check (auth.uid() = owner_id and (typ = 'kommune' or id = auth.uid()));
create policy profiles_select on public.profiles for select using (
  owner_id = auth.uid() or public.is_admin()
  or (typ = 'kommune' and status = 'approved' and (not hidden or public.is_kommune_member(id)))
);
create policy profiles_update on public.profiles for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "Everyone can view offers" on public.offers;
drop policy if exists offers_delete_own on public.offers;
drop policy if exists offers_insert_own on public.offers;
drop policy if exists offers_update_own on public.offers;
create policy offers_select on public.offers for select using (public.can_see_kommune(kommune_id));
create policy offers_delete_own on public.offers for delete using (public.owns_profile(kommune_id) or public.is_admin());
create policy offers_insert_own on public.offers for insert with check ((public.owns_profile(kommune_id) and public.is_approved_kommune(kommune_id)) or public.is_admin());
create policy offers_update_own on public.offers for update using (public.owns_profile(kommune_id) or public.is_admin())
  with check ((public.owns_profile(kommune_id) and public.is_approved_kommune(kommune_id)) or public.is_admin());

drop policy if exists "Everyone can view events" on public.events;
drop policy if exists events_delete_own on public.events;
drop policy if exists events_insert_own on public.events;
drop policy if exists events_update_own on public.events;
create policy events_select on public.events for select using (public.can_see_kommune(kommune_id));
create policy events_delete_own on public.events for delete using (public.owns_profile(kommune_id) or public.is_admin());
create policy events_insert_own on public.events for insert with check ((public.owns_profile(kommune_id) and public.is_approved_kommune(kommune_id)) or public.is_admin());
create policy events_update_own on public.events for update using (public.owns_profile(kommune_id) or public.is_admin())
  with check ((public.owns_profile(kommune_id) and public.is_approved_kommune(kommune_id)) or public.is_admin());

create policy members_select on public.kommune_members for select
  using (user_id = auth.uid() or public.owns_profile(kommune_id) or public.is_admin());
create policy members_insert on public.kommune_members for insert with check (public.owns_profile(kommune_id));
create policy members_delete on public.kommune_members for delete
  using (user_id = auth.uid() or public.owns_profile(kommune_id));

create or replace function public.kommune_members_list(p_kommune uuid)
returns table(user_id uuid, name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.name, p.avatar_url from public.kommune_members m
  join public.profiles p on p.id = m.user_id
  where m.kommune_id = p_kommune and public.owns_profile(p_kommune)
  order by m.created_at;
$$;

create or replace function public.search_people(p_q text)
returns table(id uuid, name text, bio text, land text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.bio, p.land, p.avatar_url from public.profiles p
  where public.is_early_access() and p.typ = 'person' and p.status = 'approved' and p.auffindbar
    and p.id <> auth.uid()
    and (btrim(coalesce(p_q,'')) = '' or strpos(lower(p.name), lower(btrim(p_q))) > 0)
  order by p.name limit 30;
$$;
create or replace function public.get_person(p_id uuid)
returns table(id uuid, name text, bio text, land text, avatar_url text, instagram text, website text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.bio, p.land, p.avatar_url, p.instagram, p.website, p.created_at from public.profiles p
  where public.is_early_access() and p.typ = 'person' and p.status = 'approved' and (p.auffindbar or p.id = auth.uid()) and p.id = p_id;
$$;

create or replace function public.redeem_invite_code(p_code text, p_user uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_hit boolean;
begin
  if not exists (select 1 from auth.users u where u.id = p_user and u.created_at > now() - interval '30 minutes') then
    return false;
  end if;
  update public.invite_codes set used = true, used_by = p_user
   where upper(btrim(code)) = upper(btrim(p_code)) and used = false;
  get diagnostics v_hit = row_count;
  if v_hit then update public.profiles set early_access = true where id = p_user; end if;
  return v_hit;
end $$;

commit;
