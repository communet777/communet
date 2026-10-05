import Link from 'next/link'
import { useFarmLinks } from '../lib/links'
import { useCatalog } from '../lib/catalog'
import TypIcon from './TypIcon'

// Hinweis bei einem Hofladen, der zu einer Gemeinschaft gehört (z. B. Örkhof)
export default function FarmCommunityLink({ farmId, style }) {
  const { byFarm } = useFarmLinks()
  const [COMMUNITIES] = useCatalog()
  const cid = byFarm[farmId]
  if (cid == null) return null
  const k = COMMUNITIES.find(c => c.id === cid)
  if (!k) return null
  return (
    <Link href={`/kommunen/${k.id}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--gl)', color: 'var(--g)', fontSize: 12, fontWeight: 500, textDecoration: 'none', ...style }}>
      <TypIcon typ={k.typ} size={14} badge />
      <span>Gehört zur Gemeinschaft <b>{k.name}</b> →</span>
    </Link>
  )
}
