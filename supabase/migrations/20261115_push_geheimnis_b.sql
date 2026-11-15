-- STAND 15.11.2026: Entwurf, in der Datenbank noch NICHT eingespielt.
-- Push-Empfänger nur noch für den Server – Teil B.
-- Erst einspielen, wenn PUSH_RPC_SECRET in Vercel gesetzt ist, die neue Version live ist und
-- Mitteilungen getestet sind. Danach sind die alten Funktionen für Nutzer gesperrt.

revoke execute on function public.push_targets(uuid) from public, anon, authenticated;
revoke execute on function public.offer_push_targets(uuid, uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.member_push_targets(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.drop_push_subscription(text) from public, anon, authenticated;
