# Vorlage: Fragebogen Mitbewohnersuche

Stand 21.10.2026 – offline genommen, als Vorlage aufbewahrt.

War live unter `/baumhaus-w7q2kx` (Baumhaus, Mitbewohnersuche). Die Datei liegt
bewusst außerhalb von `pages/`, damit sie keine Adresse auf communet.net hat.

## Wiederverwenden
1. `BaumhausFragebogen.js` nach `pages/<neuer-geheimer-name>.js` kopieren
   und die Importpfade wieder auf `../lib/...` bzw. `../styles/...` ändern.
2. Texte, Bilder (`BILDER`-Pfad im Bucket `seiten-bilder`) und Fragen (`FRAGEN`) anpassen.
3. Zieltabelle: Bisher `baumhaus_bewerbungen`. Für eine andere Gemeinschaft eine eigene
   Tabelle anlegen oder die Tabelle verallgemeinern.

## Datenbank
- Tabelle `baumhaus_bewerbungen` mit den bisherigen Antworten bleibt erhalten.
- Neue Einsendungen sind gesperrt: Die Policy `baumhaus_bewerbungen_insert_public`
  wurde entfernt. Zum Reaktivieren wieder anlegen:
  `create policy baumhaus_bewerbungen_insert_public on public.baumhaus_bewerbungen
   for insert to anon, authenticated with check (status = 'neu');`
