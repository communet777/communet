-- 21.10.26: Aufgaben mit optionalem Tag; alle in der Gruppe dürfen Aufgaben anlegen,
-- Ersteller dürfen eigene Aufgaben löschen und den Tag ändern
alter table public.offer_tasks add column if not exists tag date;
alter table public.offer_tasks add column if not exists created_by uuid;

create or replace function public.task_add2(p_offer uuid, p_as uuid, p_title text, p_tag date default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_title text := btrim(coalesce(p_title,''));
begin
  if public.offer_access_as(p_offer, p_as) is null then raise exception 'Nicht erlaubt'; end if;
  if v_title = '' or char_length(v_title) > 120 then raise exception 'Ungültige Aufgabe'; end if;
  if (select count(*) from public.offer_tasks where offer_id = p_offer) >= 200 then raise exception 'Liste ist voll'; end if;
  insert into public.offer_tasks(offer_id, title, tag, created_by) values (p_offer, v_title, p_tag, auth.uid());
end $$;

create or replace function public.offer_tasks_list2(p_offer uuid, p_as uuid)
returns table(id uuid, title text, tag date, assignee uuid, assignee_name text, done boolean, mine boolean, can_edit boolean)
language sql stable security definer set search_path to 'public' as $$
  select t.id, t.title, t.tag, t.assignee, p.name, t.done, t.assignee = auth.uid(),
         (public.offer_access_as(p_offer, p_as) = 'owner' or t.created_by = auth.uid())
  from public.offer_tasks t left join public.profiles p on p.id = t.assignee
  where t.offer_id = p_offer and public.offer_access_as(p_offer, p_as) is not null
  order by t.done, t.tag nulls last, t.created_at;
$$;

create or replace function public.task_act(p_id uuid, p_as uuid, p_action text)
returns void language plpgsql security definer set search_path to 'public' as $$
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
    if v_role <> 'owner' and t.created_by is distinct from auth.uid() then raise exception 'Nicht erlaubt'; end if;
    delete from public.offer_tasks where id = p_id;
  else raise exception 'Ungültige Aktion'; end if;
end $$;

create or replace function public.task_set_tag(p_id uuid, p_as uuid, p_tag date)
returns void language plpgsql security definer set search_path to 'public' as $$
declare t record; v_role text;
begin
  select * into t from public.offer_tasks where id = p_id;
  if not found then raise exception 'Nicht gefunden'; end if;
  v_role := public.offer_access_as(t.offer_id, p_as);
  if v_role is null or (v_role <> 'owner' and t.created_by is distinct from auth.uid()) then raise exception 'Nicht erlaubt'; end if;
  update public.offer_tasks set tag = p_tag where id = p_id;
end $$;
