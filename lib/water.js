import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

// Ab dieser Zoomstufe werden Wasserquellen geladen (darunter wären es zu viele Punkte)
export const WATER_MIN_ZOOM = 8
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

// Bio-Hofläden erscheinen ab derselben Zoomstufe wie Wasserquellen, damit die Karte übersichtlich bleibt
export const FARM_MIN_ZOOM = WATER_MIN_ZOOM

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
