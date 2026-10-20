-- Gerichte bearbeiten: wer es eingetragen/übernommen hat (oder die Kommune) darf Name, Kategorie, Tags, Notiz ändern
create or replace function public.dish_edit(p_id uuid, p_as uuid, p_name text, p_category text, p_tags text[], p_note text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare d record; v_role text; v_name text := btrim(coalesce(p_name,''));
begin
  select * into d from public.offer_dishes where id = p_id;
  if not found then raise exception 'Nicht gefunden'; end if;
  v_role := public.offer_access_as(d.offer_id, p_as);
  if v_role is null then raise exception 'Nicht erlaubt'; end if;
  if v_role <> 'owner' and d.claimed_by is distinct from auth.uid() and d.created_by is distinct from auth.uid() then
    raise exception 'Nur wer das Gericht eingetragen hat, kann es ändern';
  end if;
  if v_name = '' then raise exception 'Bitte einen Namen eintragen'; end if;
  update public.offer_dishes
     set name = left(v_name, 80),
         category = coalesce(nullif(btrim(coalesce(p_category,'')),''), d.category),
         tags = coalesce(p_tags, d.tags),
         note = nullif(btrim(coalesce(p_note,'')),'')
   where id = p_id;
end $$;
revoke all on function public.dish_edit(uuid, uuid, text, text, text[], text) from public, anon;
grant execute on function public.dish_edit(uuid, uuid, text, text, text[], text) to authenticated;
