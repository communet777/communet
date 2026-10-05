// Farben je Gemeinschaftstyp (Stand 5. Oktober 2026).
// Mittlere bis dunkle Töne, damit die goldenen Icons (#E9AD55) darauf lesbar bleiben.
// Ausnahme Wohnprojekt: bewusst das warme Orange (früher Kommune), Icon dort schwächer im Kontrast.
// TYP_COLORS: Kartenmarker, TYP_BG: helle Hintergrundfarbe (Kommunen-Karten, Avatare)
export const TYP_COLORS = {
  'Ökodorf': '#4E7340',
  'Kommune': '#A9502F',
  'Kollektiv': '#4B5694',
  'Spirituelle Gemeinschaft': '#8E4483',
  'Wohnprojekt': '#D9862D',
  'Hofgemeinschaft': '#8E2F45',
  'Co-Living': '#2E6E9E',
}

export const TYP_BG = {
  'Ökodorf': '#E6EEDF',
  'Kommune': '#F6E2D9',
  'Kollektiv': '#E3E6F4',
  'Spirituelle Gemeinschaft': '#F3E2EF',
  'Wohnprojekt': '#FFF3E0',
  'Hofgemeinschaft': '#F4E0E4',
  'Co-Living': '#E0ECF5',
}

// Bio-Hofläden (Marker und Kreis um das Korb-Icon)
export const FARM_COLOR = '#8C5A2B'

export function getTypColor(typ) { return TYP_COLORS[typ] || '#8a8270' }
export function getTypBg(typ) { return TYP_BG[typ] || '#E6EEDF' }

// Dunkler Rand um goldene Icons, damit sie auch auf kräftigen Farben gut lesbar sind
export const ICON_SHADOW = 'drop-shadow(0 0 1.5px rgba(0,0,0,0.7))'
