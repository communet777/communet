import { getTypIconUrl } from '../lib/typIcons'
import { getTypColor, ICON_SHADOW } from '../lib/typColors'

// Goldenes Icon für einen Gemeinschaftstyp (typ) oder eine beliebige Icon-Datei (src).
// badge = Icon in einem Kreis in der Farbe des Typs (wie die Marker auf der Karte),
// bg = eigene Kreisfarbe (z. B. für Bio-Hofläden).
export default function TypIcon({ typ, src, size = 20, badge = false, bg }) {
  const img = <img src={src || getTypIconUrl(typ)} alt="" width={size} height={size} style={{ display: 'block', width: size, height: size, filter: badge ? ICON_SHADOW : 'none' }} />
  if (!badge) return <span style={{ display: 'inline-flex', verticalAlign: '-0.15em' }}>{img}</span>
  const d = Math.round(size * 1.7)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: d, height: d, borderRadius: '50%', background: bg || (typ ? getTypColor(typ) : '#123A2E'), border: '1.5px solid #C9A84C', flexShrink: 0 }}>
      {img}
    </span>
  )
}
