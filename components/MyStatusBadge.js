// Ampel für die eigene Teilnahme an einem Angebot:
// blau = nur im Feed, grün = dabei, gelb = angefragt, rot = abgelehnt
export const STATUS = {
  angenommen: { label: '✓ Du bist dabei', color: '#2E8B57', text: 'white' },
  angefragt: { label: '⏳ Angefragt', color: '#F2C230', text: '#173F4A' },
  abgelehnt: { label: '✕ Abgelehnt', color: '#C0392B', text: 'white' },
}
export const statusColor = s => (STATUS[s] ? STATUS[s].color : 'var(--g)')

export default function MyStatusBadge({ status }) {
  const s = STATUS[status]
  if (!s) return null
  return <span style={{ fontSize: 11, fontWeight: 700, background: s.color, color: s.text, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{s.label}</span>
}
