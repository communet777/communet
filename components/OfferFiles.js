import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const BUCKET = 'angebot-dateien'
const MAX = 25 * 1024 * 1024

function size(b) {
  if (!b && b !== 0) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}
function icon(mime = '', name = '') {
  if (mime.startsWith('image/')) return '🖼️'
  if (mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return '📄'
  if (/sheet|excel|csv/.test(mime)) return '📊'
  return '📎'
}

// Dateien eines Angebots — nur für die Gruppe (gleiche Regel wie der Chat)
export default function OfferFiles({ offerId, asId, isOwner }) {
  const { user } = useAuth()
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const inputRef = useRef(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('offer_files').select('*').eq('offer_id', offerId).order('created_at', { ascending: false })
    setFiles(data || [])
  }, [offerId])
  useEffect(() => { load() }, [load])

  async function upload(e) {
    const list = [...(e.target.files || [])]
    e.target.value = ''
    if (!list.length) return
    setBusy(true); setErr('')
    for (const f of list) {
      if (f.size > MAX) { setErr(`„${f.name}“ ist größer als 25 MB.`); continue }
      const safe = f.name.replace(/[^\w.\-]+/g, '_').slice(-120)
      const pfad = `${offerId}/${crypto.randomUUID()}-${safe}`
      const up = await supabase.storage.from(BUCKET).upload(pfad, f, { contentType: f.type || undefined })
      if (up.error) { setErr(up.error.message); continue }
      const { error } = await supabase.from('offer_files').insert({ offer_id: offerId, uploader_profile_id: asId, name: f.name.slice(0, 200), pfad, groesse: f.size, mime: f.type || null })
      if (error) { setErr(error.message); await supabase.storage.from(BUCKET).remove([pfad]) }
    }
    setBusy(false); load()
  }

  async function open(f) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(f.pfad, 300)
    if (error) { setErr(error.message); return }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function del(f) {
    if (!window.confirm(`„${f.name}“ löschen?`)) return
    await supabase.storage.from(BUCKET).remove([f.pfad])
    const { error } = await supabase.from('offer_files').delete().eq('id', f.id)
    if (error) setErr(error.message)
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={() => inputRef.current?.click()} disabled={busy} style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: 'var(--g)', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{busy ? 'Lädt hoch …' : '+ Datei hinzufügen'}</button>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Pläne, Fotos, Listen · max. 25 MB · nur für diese Gruppe sichtbar</span>
        <input ref={inputRef} type="file" multiple onChange={upload} style={{ display: 'none' }} />
      </div>
      {files.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Noch keine Dateien.</div>}
      {files.map(f => (
        <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
          <span aria-hidden style={{ fontSize: 20 }}>{icon(f.mime || '', f.name)}</span>
          <button onClick={() => open(f)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', padding: 0, color: 'var(--text)', fontWeight: 600, fontSize: 14, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</button>
          <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{size(f.groesse)} · {new Date(f.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
          {(f.uploader_user_id === user?.id || isOwner) && (
            <button onClick={() => del(f)} aria-label="Löschen" style={{ padding: '4px 8px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>✕</button>
          )}
        </div>
      ))}
      {err && <p style={{ color: '#c0392b', fontSize: 13, margin: '8px 0 0' }}>{err}</p>}
    </div>
  )
}
