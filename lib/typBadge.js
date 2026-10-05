// Badge-Klassen und Reihenfolge aller Gemeinschaftstypen (inkl. Hofgemeinschaft und Co-Living)
export const ALL_TYPES = ['Ökodorf', 'Kommune', 'Kollektiv', 'Spirituelle Gemeinschaft', 'Wohnprojekt', 'Hofgemeinschaft', 'Co-Living']

export function getTypBadge(typ) {
  const map = {
    'Ökodorf': 'badge-oeko',
    'Kommune': 'badge-kommune',
    'Kollektiv': 'badge-kollektiv',
    'Spirituelle Gemeinschaft': 'badge-spirituell',
    'Wohnprojekt': 'badge-wohn',
    'Hofgemeinschaft': 'badge-hofgemeinschaft',
    'Co-Living': 'badge-coliving',
  }
  return map[typ] || 'badge-oeko'
}

// Nur Typen als Filter zeigen, zu denen es auch Einträge gibt
export function typesPresent(list) {
  const present = new Set((list || []).map(k => k.typ))
  return ALL_TYPES.filter(t => present.has(t))
}
