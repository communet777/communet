-- 24.11.26: Testläufe des Gemeinschaftsformen-Quiz (versteckte Testseite /quiz-test.html).
-- Zum Ausführen: Supabase → SQL Editor → diesen Inhalt einfügen → Run.
-- Jeder darf einen fertigen Durchlauf eintragen, niemand kann von außen lesen (wie baumhaus_bewerbungen).
-- Lesen nur im Supabase-Dashboard (Table Editor → quiz_runs) oder per SQL.
-- Vor dem Launch: Testseite und Tabelle prüfen bzw. entfernen.
create table if not exists public.quiz_runs (
  id bigint generated always as identity primary key,
  run_id text not null,
  player text,
  stage text,
  data jsonb not null,
  created_at timestamptz not null default now()
);
comment on table public.quiz_runs is 'Testdurchläufe des Gemeinschaftsformen-Quiz (Testseite /quiz-test.html). Kein SELECT für anon/authenticated. Vor dem Launch prüfen bzw. entfernen.';
alter table public.quiz_runs enable row level security;
revoke all on public.quiz_runs from anon, authenticated;
grant insert (run_id, player, stage, data) on public.quiz_runs to anon, authenticated;
drop policy if exists quiz_runs_insert_public on public.quiz_runs;
create policy quiz_runs_insert_public on public.quiz_runs
  for insert to anon, authenticated
  with check (
    length(run_id) between 8 and 80
    and (player is null or length(player) <= 40)
    and stage in ('fertig','was-waere-wenn')
    and pg_column_size(data) < 40000
  );
