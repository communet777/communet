// Zeigt auf Angebotskarten, ob man selbst schon eingetragen ist
const STYLES = {
  angenommen: { label: '✓ Du bist dabei', bg: 'var(--g)', color: 'white' },
  angefragt: { label: '⏳ Angefragt', bg: 'var(--gold, #E9AD55)', color: '#173F4A' },
  abgelehnt: { label: 'Abgelehnt', bg: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)' },
}
export default function MyStatusBadge({ status }) {
  const s = STYLES[status]
  if (!s) return null
  return <span style={{ fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: s.border || 'none', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{s.label}</span>
}
