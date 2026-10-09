// Kartenkacheln: CARTO Voyager (lateinische Ortsnamen weltweit). CARTO verlangt einen kostenlosen Schlüssel
// (NEXT_PUBLIC_CARTO_KEY). Ohne Schlüssel fällt die Karte auf OpenStreetMap zurück, damit sie nie leer bleibt.
const KEY = process.env.NEXT_PUBLIC_CARTO_KEY
export const TILE_URL = KEY
  ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${KEY}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
export const TILE_SUBDOMAINS = KEY ? 'abcd' : 'abc'
export const TILE_ATTRIBUTION = KEY
  ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
