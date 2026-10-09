import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { urlBase64ToUint8Array } from '../lib/push'

// Schalter für Mitteilungen bei neuen Nachrichten. Auf dem iPhone nur in der installierten App möglich.
export default function PushToggle() {
  const { user } = useAuth()
  const [state, setState] = useState('loading') // loading | unsupported | off | on | denied
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [diag, setDiag] = useState('')
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(() => {
    if (!user) return
    if (!key || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { setState('unsupported'); return }
    if (Notification.permission === 'denied') { setState('denied'); return }
    navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()).then(s => setState(s && Notification.permission === 'granted' ? 'on' : 'off')).catch(() => setState('unsupported'))
  }, [user])

  async function enable() {
    setBusy(true); setMsg('')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'off'); setBusy(false); return }
      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) })
      const j = sub.toJSON()
      const { error } = await supabase.from('push_subscriptions').upsert({ user_id: user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth_key: j.keys.auth }, { onConflict: 'endpoint' })
      if (error) throw error
      setState('on')
    } catch (e) { setMsg('Das hat nicht geklappt: ' + (e.message || e)) }
    setBusy(false)
  }

  async function disable() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) { await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe() }
      setState('off')
    } catch {}
    setBusy(false)
  }

  async function test() {
    setBusy(true); setDiag('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/push/test', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
      const j = await r.json()
      setDiag(JSON.stringify(j, null, 1))
    } catch (e) { setDiag('Fehler: ' + (e.message || e)) }
    setBusy(false)
  }

  if (!user || state === 'loading') return null
  const box = { background: 'var(--card)', borderRadius: 12, padding: '12px 14px', marginBottom: 16, fontSize: 13, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }
  const btn = { padding: '8px 14px', background: 'var(--g)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }
  if (state === 'unsupported') return <div style={box}><span>🔔 Mitteilungen sind hier nicht verfügbar. Auf dem iPhone: Seite über „Teilen → Zum Home-Bildschirm“ installieren und von dort öffnen. Mehr dazu auf der <a href="/app" style={{color:'var(--g)'}}>App-Seite</a>.</span></div>
  if (state === 'denied') return <div style={box}><span>🔕 Mitteilungen sind in den Geräte-Einstellungen blockiert. Erlaube sie dort für Communet.</span></div>
  return (
    <div style={box}>
      <span>{state === 'on' ? '🔔 Du bekommst Mitteilungen bei neuen Nachrichten.' : '🔔 Mitteilungen bei neuen Nachrichten aktivieren?'}{msg && <><br/><span style={{color:'#b3261e'}}>{msg}</span></>}</span>
      {state === 'on' ? <button onClick={disable} disabled={busy} style={{...btn, background:'none', color:'var(--muted)', border:'1px solid var(--border)'}}>Ausschalten</button> : <button onClick={enable} disabled={busy} style={btn}>{busy ? '…' : 'Aktivieren'}</button>}
    </div>
  )
}
