import { getTypIconUrl } from '../lib/typIcons'

// Goldenes Icon für einen Gemeinschaftstyp (typ) oder eine beliebige Icon-Datei (src).
// badge = Icon in einem dunkelgrünen Kreis, wie die Marker auf der Karte.
export default function TypIcon({ typ, src, size = 20, badge = false }) {
  const img = <img src={src || getTypIconUrl(typ)} alt="" width={size} height={size} style={{ display: 'block', width: size, height: size }} />
  if (!badge) return <span style={{ display: 'inline-flex', verticalAlign: '-0.15em' }}>{img}</span>
  const d = Math.round(size * 1.7)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: d, height: d, borderRadius: '50%', background: '#123A2E', flexShrink: 0 }}>
      {img}
    </span>
  )
}
