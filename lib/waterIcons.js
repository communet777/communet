// Goldene Icons für die Wasserquellen-Kategorien
import { ICONS } from './typIcons'

function goldIcon(path) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480"><g transform="translate(0,480) scale(1,-1)" fill="#E9AD55"><path d="${path}"/></g></svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}

const HEIL = 'M232 419 c-40 -32 -73 -79 -82 -114 -3 -12 -2 -34 1 -47 6 -21 18 -40 35 -53 33 -27 82 -27 116 0 33 26 46 74 31 114 -7 18 -28 51 -44 69 -13 13 -41 39 -44 40 -1 0 -7 -4 -13 -9z m-39 -149 c2 -2 3 -4 3 -5 0 -7 16 -26 28 -31 11 -6 13 -8 10 -14 -5 -11 -37 11 -48 34 -5 10 -6 15 -1 17 4 3 5 2 8 -1z M352 259 c-7 -5 -6 -14 2 -19 43 -25 56 -56 39 -87 -11 -20 -40 -39 -76 -50 -83 -25 -190 -2 -222 49 -5 7 -7 12 -9 22 -1 6 -1 8 1 17 3 15 18 32 36 43 12 9 14 12 11 20 -4 8 -11 8 -21 1 -42 -27 -59 -65 -44 -102 8 -22 33 -45 63 -59 4 -2 9 -5 10 -5 10 -5 42 -13 65 -17 30 -4 62 -3 101 5 6 1 23 6 28 8 1 0 5 2 9 4 38 14 67 41 76 72 2 8 2 27 0 35 -5 18 -17 34 -33 48 -20 16 -30 20 -36 15z M139 220 c-9 -9 -12 -17 -12 -30 0 -8 0 -12 2 -16 21 -55 148 -70 208 -26 25 19 31 45 13 68 -6 10 -13 11 -19 5 -5 -5 -5 -10 1 -17 9 -12 9 -21 -1 -31 -7 -8 -23 -17 -33 -20 -2 0 -6 -2 -9 -2 -11 -3 -15 -4 -31 -5 -59 -5 -117 21 -109 49 0 2 3 6 5 9 8 11 6 20 -5 22 -4 0 -4 0 -10 -6z'
const FRAGE = 'M221 460 c-72 -9 -124 -64 -128 -133 0 -15 -4 -13 40 -14 46 0 42 -2 45 15 8 37 25 56 55 58 30 1 49 -14 50 -39 1 -22 -9 -38 -36 -57 -26 -19 -31 -23 -40 -32 -21 -20 -27 -40 -27 -78 -1 -28 -6 -25 43 -25 46 0 42 -1 44 14 4 30 12 41 49 66 48 32 68 59 71 97 7 82 -70 142 -166 128z M212 134 c-44 -11 -60 -67 -28 -101 31 -31 87 -14 97 30 10 42 -28 80 -69 71z'

export const WATER_ICONS = {
  'Trinkwasserquelle': ICONS.tropfen,
  'Heilquelle': goldIcon(HEIL),
  'Thermalquelle': ICONS.thermalquelle,
  'Wasserquelle zur Versorgung': goldIcon(FRAGE),
}

export function getWaterIcon(typ) { return WATER_ICONS[typ] || ICONS.tropfen }
