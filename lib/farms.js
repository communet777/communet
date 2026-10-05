// Bio-Hofläden für die Karten: eine schlanke Liste aus Supabase (RPC farm_points),
// statt drei Tabellen mit großen Rohdaten-Spalten seitenweise zu laden.
// Einmal pro Sitzung geladen und zwischengespeichert (Karte und Versorgung teilen sich die Liste).
import { supabase } from './supabase'
import { countryName } from './countries'

let cache = null
let pending = null

export function loadFarmPoints() {
  if (cache) return Promise.resolve(cache)
  if (!pending) {
    pending = supabase.rpc('farm_points').then(({ data, error }) => {
      if (error) { console.error('Hofläden laden fehlgeschlagen:', error); pending = null; return [] }
      cache = (data || []).map(f => {
        if (f.id.startsWith('fr_')) return { ...f, hinweis: 'Quelle: Agence Bio (Licence Ouverte 2.0)' }
        if (f.id.startsWith('osm_')) return { ...f, bundesland: countryName(f.country), hinweis: 'Bio-Angabe aus OpenStreetMap (Community), nicht amtlich geprüft. Daten © OpenStreetMap-Mitwirkende (ODbL)' }
        return f
      })
      return cache
    })
  }
  return pending
}
