// Ländernamen (deutsch) für zweistellige Ländercodes aus den OSM-Importen
export const COUNTRY_NAMES = {
  ES: 'Spanien', PT: 'Portugal', BE: 'Belgien', CH: 'Schweiz', AT: 'Österreich', IT: 'Italien', DK: 'Dänemark',
  GB: 'Großbritannien', IE: 'Irland', NL: 'Niederlande', LU: 'Luxemburg', LI: 'Liechtenstein',
  PL: 'Polen', CZ: 'Tschechien', SK: 'Slowakei', HU: 'Ungarn', SI: 'Slowenien', HR: 'Kroatien',
  BA: 'Bosnien und Herzegowina', RS: 'Serbien', ME: 'Montenegro', XK: 'Kosovo', AL: 'Albanien', MK: 'Nordmazedonien',
  GR: 'Griechenland', BG: 'Bulgarien', RO: 'Rumänien', MD: 'Moldau', UA: 'Ukraine', BY: 'Belarus',
  LT: 'Litauen', LV: 'Lettland', EE: 'Estland', FI: 'Finnland', SE: 'Schweden', NO: 'Norwegen',
  IS: 'Island', CY: 'Zypern', MT: 'Malta', AD: 'Andorra', RU: 'Russland', DE: 'Deutschland', FR: 'Frankreich',
  TR: 'Türkei',
}
export function countryName(code) { return COUNTRY_NAMES[code] || code }
