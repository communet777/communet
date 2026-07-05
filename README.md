# Communet

Alternative Lebensgemeinschaften — Plattform für Kommunen, Ökodörfer und Menschen.

## Setup (5 Minuten)

### 1. Node.js installieren
→ https://nodejs.org (LTS Version)

### 2. Diesen Ordner öffnen
Entpacke die ZIP-Datei und öffne den Ordner `communet` in VS Code.

### 3. Terminal öffnen und starten
```bash
npm install
npm run dev
```

### 4. Browser öffnen
→ http://localhost:3000

---

## Seiten

| URL | Beschreibung |
|-----|-------------|
| `/` | Startseite mit rotierender Weltkugel |
| `/kommunen` | Verzeichnis aller Gemeinschaften |
| `/kommunen/1` | Profil Sieben Linden |
| `/kommunen/2` | Profil ZEGG |
| `/kommunen/[id]` | Beliebiges Kommunen-Profil |

## Nächste Schritte

1. Weltkugel-Textur austauschen (Globe.js)
2. Supabase-Datenbank verbinden
3. Echte Nutzerkonten (Login/Register)
4. Lebensstunden-Buchungssystem
5. Interaktive Karte (Leaflet + OpenStreetMap)

## Tech Stack

- **Next.js 14** — React Framework
- **CSS Modules** — Styling
- **Vercel** — Hosting (kostenlos)
- **Supabase** — Datenbank + Auth (kommt in Phase 2)
