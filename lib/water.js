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
}

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

// Bio-Hofläden erscheinen ab derselben Zoomstufe wie Wasserquellen, damit die Karte übersichtlich bleibt
export const FARM_MIN_ZOOM = WATER_MIN_ZOOM

// Liegt ein Punkt im aktuellen Kartenausschnitt?
export function inView(p, view) {
  return !!view && p.lat >= view.south && p.lat <= view.north && p.lon >= view.west && p.lon <= view.east
}

// Lädt die Wasserquellen im aktuellen Kartenausschnitt (nur wenn aktiv und weit genug hineingezoomt)
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
        .select('osm_id,lat,lon,name,typ,road_distance_m,road_type,track_distance_m,drinking_water')
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
