// Goldene Icons (#C9A84C) aus dem Communet Design System — Dateien liegen in /public/icons
const TYP_SLUGS = {
  'Ökodorf': 'oekodorf',
  'Kommune': 'kommune',
  'Kollektiv': 'kollektiv',
  'Spirituelle Gemeinschaft': 'spirituell',
  'Wohnprojekt': 'wohnprojekt',
  'Hofgemeinschaft': 'hofgemeinschaft',
  'Co-Living': 'co-living',
}

// Unbekannte Typen bekommen das Icon "Entdecken"
export function getTypIconUrl(typ) {
  return `/icons/typ/${TYP_SLUGS[typ] || 'entdecken'}.svg`
}

export const ICONS = {
  korb: '/icons/korb.svg',
  tropfen: '/icons/tropfen.svg',
  thermalquelle: '/icons/thermalquelle.svg',
  brief: '/icons/brief.svg',
  karte: '/icons/karte.svg',
}
