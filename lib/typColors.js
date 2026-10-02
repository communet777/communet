// Farben je Gemeinschaftstyp
// TYP_COLORS: kräftige Farbe (Kartenmarker), TYP_BG: helle Hintergrundfarbe (Kommunen-Karten, Avatare)
export const TYP_COLORS = {
  'Ökodorf': '#2d6a4f',
  'Kommune': '#e07820',
  'Kollektiv': '#3f51b5',
  'Spirituelle Gemeinschaft': '#8e24aa',
  'Wohnprojekt': '#00897b',
}

export const TYP_BG = {
  'Ökodorf': '#e8f5ee',
  'Kommune': '#fff3e0',
  'Kollektiv': '#e8eaf6',
  'Spirituelle Gemeinschaft': '#f3e5f5',
  'Wohnprojekt': '#e0f2f1',
}

export function getTypColor(typ) { return TYP_COLORS[typ] || '#757575' }
export function getTypBg(typ) { return TYP_BG[typ] || '#e8f5ee' }

// Dunkler Rand um goldene Icons, damit sie auch auf kräftigen Farben gut lesbar sind
export const ICON_SHADOW = 'drop-shadow(0 0 1.5px rgba(0,0,0,0.7))'
