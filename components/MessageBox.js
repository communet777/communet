import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useActiveProfile } from '../lib/ActiveProfileContext'

// Startet eine Unterhaltung. Absender ist immer das persönliche Profil (Kommunen dürfen nur antworten).
export default function MessageBox({ toId, defaultText = '', label = 'Nachricht schreiben' }) {
  const { user } = useAuth()
  const { earlyAccess, person, refreshUnread } = useActiveProfile()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(defaultText)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  if (!user || !earlyAccess || !person || toId === person.id) return null

  async function send() {
    setSending(true); setError('')
    const { data, error: err } = await supabase.rpc('send_message', { p_from: person.id, p_to: toId, p_body: text })
    setSending(false)
    if (err) { setError(err.message); return }
    refreshUnread()
    router.push(`/nachrichten/${data}`)
  }

  if (!open) return <button onClick={() => setOpen(true)} style={{padding:'10px 18px',background:'var(--g)',color:'white',border:'none',borderRadius:10,fontSize:14,fontWeight:600,cursor:'pointer'}}>✉️ {label}</button>
  return (
    <div style={{background:'var(--card)',borderRadius:14,padding:16,display:'flex',flexDirection:'column',gap:10}}>
      <textarea rows={4} maxLength={2000} value={text} onChange={e => setText(e.target.value)} placeholder="Deine Nachricht…" style={{width:'100%',padding:10,borderRadius:10,border:'1.5px solid var(--border)',fontFamily:'inherit',fontSize:14}}/>
      {error && <div style={{color:'#b3261e',fontSize:13}}>{error}</div>}
      <div style={{display:'flex',gap:8}}>
        <button onClick={send} disabled={sending || !text.trim()} style={{padding:'9px 18px',background:'var(--g)',color:'white',border:'none',borderRadius:10,fontWeight:600,cursor:'pointer',opacity:sending||!text.trim()?0.6:1}}>{sending ? 'Sendet…' : 'Senden'}</button>
        <button onClick={() => setOpen(false)} style={{padding:'9px 14px',background:'none',border:'none',color:'var(--muted)',cursor:'pointer'}}>Abbrechen</button>
      </div>
    </div>
  )
}
