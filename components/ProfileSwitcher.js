import { useActiveProfile } from '../lib/ActiveProfileContext'

// Umschalter zwischen persönlichem Profil und eigenen Kommunen. Zeigt sich nur, wenn es mehr als ein Profil gibt.
export default function ProfileSwitcher({ style }) {
  const { profiles, active, setActiveId } = useActiveProfile()
  if (profiles.length < 2) return null
  return (
    <select
      aria-label="Profil wechseln"
      value={active?.id || ''}
      onChange={e => setActiveId(e.target.value)}
      onClick={e => e.stopPropagation()}
      style={{ padding: '6px 10px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, maxWidth: 190, ...style }}
    >
      {profiles.map(p => (
        <option key={p.id} value={p.id}>{p.typ === 'person' ? '👤 ' : p.hidden ? '🔒 ' : '🏡 '}{p.name || (p.typ === 'person' ? 'Ich' : 'Kommune')}</option>
      ))}
    </select>
  )
}
