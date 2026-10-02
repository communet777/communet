// Farben je Gemeinschaftstyp.
// Gemeinsamer Nenner: jede Farbe ist zu 30 % mit dem Communet-Gold #C9A84C (RGB 201/168/76) gemischt,
// dadurch wirken die Farben wärmer und passen zueinander.
// TYP_COLORS: Kartenmarker, TYP_BG: helle Hintergrundfarbe (Kommunen-Karten, Avatare)
export const TYP_COLORS = {
  'Ökodorf': '#5c7d4e',
  'Kommune': '#d9862d',
  'Kollektiv': '#686b96',
  'Spirituelle Gemeinschaft': '#a04c8e',
  'Wohnprojekt': '#3c926d',
}

export const TYP_BG = {
  'Ökodorf': '#e8f5ee',
  'Kommune': '#fff3e0',
  'Kollektiv': '#e8eaf6',
  'Spirituelle Gemeinschaft': '#f3e5f5',
  'Wohnprojekt': '#e0f2f1',
}

// Bio-Hofläden (Marker und Kreis um das Korb-Icon)
export const FARM_COLOR = '#b07933'

export function getTypColor(typ) { return TYP_COLORS[typ] || '#8a8270' }
export function getTypBg(typ) { return TYP_BG[typ] || '#e8f5ee' }

// Dunkler Rand um goldene Icons, damit sie auch auf kräftigen Farben gut lesbar sind
export const ICON_SHADOW = 'drop-shadow(0 0 1.5px rgba(0,0,0,0.7))'
