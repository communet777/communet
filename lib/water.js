import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

// Ab dieser Zoomstufe werden Wasserquellen geladen (darunter wären es zu viele Punkte)
export const WATER_MIN_ZOOM = 6
// Höchstens so viele Quellen pro Kartenausschnitt
export const WATER_LIMIT = 1000

export const WATER_COLORS = {
  'Wasserquelle zur Versorgung': '#2b7bb9',
  'Trinkwasserquelle': '#1b9e77',
  'Heilquelle': '#8e44ad',
  'Thermalquelle': '#d9662f',
}

// Kategorien in Anzeige-Reihenfolge. defaultOn = beim ersten Öffnen aktiv.
// "Wasserquelle zur Versorgung" hat kein drinking_water-Tag in OSM = nicht verifiziert.
export const WATER_CATEGORIES = [
  { key: 'Trinkwasserquelle', label: 'Trinkwasser', icon: '💧', defaultOn: true },
  { key: 'Heilquelle', label: 'Heilquelle', icon: '🌿', defaultOn: true },
  { key: 'Thermalquelle', label: 'Thermalquelle', icon: '♨️', defaultOn: false },
  { key: 'Wasserquelle zur Versorgung', label: 'Nicht verifiziert', icon: '❔', defaultOn: false },
]
export const DEFAULT_WATER_CATEGORIES = WATER_CATEGORIES.filter(c => c.defaultOn).map(c => c.key)

const ROAD_LABELS = {
  motorway: 'Autobahn', motorway_link: 'Autobahn-Auffahrt',
  trunk: 'Schnellstraße', trunk_link: 'Auffahrt',
  primary: 'Hauptstraße', primary_link: 'Auffahrt',
  secondary: 'Landstraße', secondary_link: 'Auffahrt',
  tertiary: 'Kreisstraße', tertiary_link: 'Auffahrt',
  unclassified: 'Nebenstraße', residential: 'Wohnstraße',
  living_street: 'Spielstraße', service: 'Zufahrt', road: 'Straße',
}
export function roadLabel(t) { return ROAD_LABELS[t] || 'Straße' }

// Eine Entfernungszahl statt zwei: die kürzere von Straße/Feldweg.
// viaTrack=true heißt: nur über unbefestigten Weg erreichbar, nicht garantiert legal befahrbar.
export function bestDistance(w) {
  const road = w.road_distance_m
  const track = w.track_distance_m
  if (road != null && (track == null || road <= track)) {
    return { m: road, viaTrack: false, roadType: w.road_type }
  }
  if (track != null) {
    return { m: track, viaTrack: true, roadType: null }
  }
  return null
}

// Bio-Hofläden bleiben bei Zoomstufe 8 (eigener Wert, unabhängig von WATER_MIN_ZOOM) —
// bei zu vielen sichtbaren Punkten gleichzeitig würde die Karte sonst überladen wirken
export const FARM_MIN_ZOOM = 8

// Liegt ein Punkt im aktuellen Kartenausschnitt?
export function inView(p, view) {
  return !!view && p.lat >= view.south && p.lat <= view.north && p.lon >= view.west && p.lon <= view.east
}

// Lädt die Wasserquellen im aktuellen Kartenausschnitt (nur wenn aktiv und weit genug hineingezoomt).
// Lädt alle Kategorien, die Auswahl passiert client-seitig über activeCategories (schnelleres Umschalten).
export function useWaterSources(enabled, view) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const reqId = useRef(0)

  useEffect(() => {
    if (!enabled || !view || view.zoom < WATER_MIN_ZOOM) {
      reqId.current++
      setItems([])
      setLoading(false)
      return
    }
    const id = ++reqId.current
    const timer = setTimeout(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('water_sources')
        .select('osm_id,lat,lon,name,typ,road_distance_m,road_type,track_distance_m,drinking_water,access,wiki_url,wiki_title,wiki_image_url,wiki_extract')
        .gte('lat', view.south).lte('lat', view.north)
        .gte('lon', view.west).lte('lon', view.east)
        .limit(WATER_LIMIT)
      if (id !== reqId.current) return
      setLoading(false)
      if (error) { console.error('Wasserquellen laden fehlgeschlagen:', error); setError(error.message); setItems([]); return }
      setError(null)
      setItems(data || [])
    }, 250)
    return () => clearTimeout(timer)
  }, [enabled, view?.south, view?.west, view?.north, view?.east, view?.zoom])

  return { items, loading, error }
}

// Formatiert Koordinaten als lesbaren Text, z.B. 49.0852° N, 7.5888° O
export function formatCoords(lat, lon) {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'O' : 'W'
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lon).toFixed(4)}° ${ew}`
}

// Ermittelt einmalig eine einfache Adresse zu Koordinaten über den offenen
// Adressdienst von OpenStreetMap (Nominatim) — bewusst direkt im Browser der
// Nutzer aufgerufen, nicht vom Server aus (dort blockt Nominatim automatisierte
// Massenabfragen; einzelne Abrufe durch echte Besucher sind ausdrücklich erlaubt).
export async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14&accept-language=de`
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`)
  const data = await res.json()
  const a = data.address || {}
  const parts = [a.hamlet || a.village || a.town || a.city || a.municipality, a.county, a.country].filter(Boolean)
  return parts.length ? parts.join(', ') : (data.display_name || null)
}

// Merkt sich die letzte Kartenposition pro Seite im Browser (übersteht Navigation
// innerhalb derselben Sitzung), damit man nach "Zurück" nicht wieder bei der
// Weltansicht landet.
export function saveMapView(key, view) {
  if (typeof window === 'undefined' || !view) return
  try {
    sessionStorage.setItem(key, JSON.stringify({
      lat: (view.south + view.north) / 2,
      lon: (view.west + view.east) / 2,
      zoom: view.zoom,
    }))
  } catch { /* z.B. privater Modus ohne Storage-Zugriff */ }
}

export function loadMapView(key) {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Grobe Europa-Box als Startvorgabe, wenn noch kein Kartenausschnitt bekannt ist
// (west, north, east, south) — dient nur als Bevorzugung, keine harte Grenze.
const EUROPE_BIAS = { west: -25, north: 72, east: 45, south: 27 }

// Ortssuche wie bei Google Maps: Freitext -> Koordinaten + Begrenzungsrahmen, über
// den offenen Adressdienst von OpenStreetMap (Nominatim), client-seitig aufgerufen.
// `bias` (optional): aktuell sichtbarer Kartenausschnitt {south,west,north,east} —
// Treffer darin/in der Nähe werden bevorzugt (keine harte Einschränkung, damit
// weltweite Suche z.B. für Kommunen weiter funktioniert). Ohne bias: Europa-Vorgabe.
export async function geocodeSearch(query, bias) {
  const box = bias || EUROPE_BIAS
  const viewbox = `${box.west},${box.north},${box.east},${box.south}`
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&viewbox=${viewbox}&accept-language=de`
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`)
  const data = await res.json()
  if (!data.length) return null
  // Unter den Top-Treffern den bevorzugen, der wirklich im aktuellen/Europa-Ausschnitt liegt
  const inBox = data.find(d => {
    const lat = parseFloat(d.lat), lon = parseFloat(d.lon)
    return lat <= box.north && lat >= box.south && lon >= box.west && lon <= box.east
  })
  const best = inBox || data[0]
  const bb = best.boundingbox // [south, north, west, east] als Strings
  return {
    lat: parseFloat(best.lat),
    lon: parseFloat(best.lon),
    label: best.display_name,
    bbox: bb ? [parseFloat(bb[0]), parseFloat(bb[1]), parseFloat(bb[2]), parseFloat(bb[3])] : null,
  }
}

// Bringt eine Zeile aus farm_shops_fr (Frankreich, eigenes Schema) in dieselbe
// Form wie farm_shops (Deutschland), damit beide zusammen angezeigt werden
// können. IDs werden mit "fr_" markiert, damit sie nicht mit deutschen
// numerischen IDs kollidieren.
export function normalizeFarmShopFr(row) {
  return {
    id: `fr_${row.numero_bio}`,
    name: row.name,
    strasse: row.adresse,
    plz: row.code_postal,
    ort: row.ville,
    bundesland: row.departement,
    bio_verband: row.organisme_certificateur,
    lat: row.lat,
    lon: row.lon,
    website: row.site_web,
    telefon: row.raw?.telephone || null,
    email: row.raw?.email || null,
  }
}
