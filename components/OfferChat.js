import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { notifyOfferPush } from '../lib/push'

const PAGE = 50

const dayKey = d => new Date(d).toDateString()
function dayLabel(d) {
  const x = new Date(d), today = new Date(), yest = new Date(); yest.setDate(today.getDate() - 1)
  if (x.toDateString() === today.toDateString()) return 'Heute'
  if (x.toDateString() === yest.toDateString()) return 'Gestern'
  return x.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: x.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}
function merge(a, b) {
  const map = new Map()
  for (const m of a) map.set(m.id, m)
  for (const m of b) map.set(m.id, m)
  return [...map.values()].sort((x, y) => new Date(x.created_at) - new Date(y.created_at))
}

// Gruppen-Chat eines Angebots. Lädt die neuesten Nachrichten, ältere beim Hochscrollen.
// embedded: im Reiter von OfferOrganisation (ohne eigene Karte)
export default function OfferChat({ offerId, asId, ankuendigung, embedded }) {
  const [msgs, setMsgs] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingOld, setLoadingOld] = useState(false)
  const [ready, setReady] = useState(false)
  const [lastRead, setLastRead] = useState(null)   // Lesestand beim Öffnen -> Position der "Neu"-Linie
  const [unseen, setUnseen] = useState(0)          // neue Nachrichten, während man weiter oben liest
  const [away, setAway] = useState(false)          // weiter oben im Verlauf -> Sprung-Knopf zeigen
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const boxRef = useRef(null)
  const atBottom = useRef(true)
  const keepScroll = useRef(null)
  const firstScroll = useRef(true)
  const newestRef = useRef(null)

  const scrollToBottom = useCallback((smooth) => {
    const el = boxRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    setUnseen(0)
  }, [])

  const markRead = useCallback(() => { supabase.rpc('offer_chat_mark_read', { p_offer: offerId }) }, [offerId])

  // Erstes Laden: Lesestand + neueste Seite
  useEffect(() => {
    let alive = true
    setReady(false); setMsgs([]); firstScroll.current = true
    ;(async () => {
      const [{ data: lr }, { data }] = await Promise.all([
        supabase.rpc('offer_chat_last_read', { p_offer: offerId }),
        supabase.rpc('offer_chat_page', { p_offer: offerId, p_as: asId, p_limit: PAGE }),
      ])
      if (!alive) return
      setLastRead(lr || null)
      setMsgs(data || [])
      setHasMore((data || []).length >= PAGE)
      setReady(true)
      markRead()
    })()
    return () => { alive = false }
  }, [offerId, asId, markRead])

  // Neue Nachrichten alle 8 s abholen (nur die neueste Seite, wird zusammengeführt)
  const poll = useCallback(async () => {
    const { data } = await supabase.rpc('offer_chat_page', { p_offer: offerId, p_as: asId, p_limit: PAGE })
    if (!data) return
    setMsgs(prev => {
      const known = new Set(prev.map(m => m.id))
      const fresh = data.filter(m => !known.has(m.id))
      if (fresh.length === 0) return prev
      if (atBottom.current) markRead()
      else setUnseen(n => n + fresh.filter(m => !m.mine).length)
      return merge(prev, data)
    })
  }, [offerId, asId, markRead])
  useEffect(() => {
    if (!ready) return
    const t = setInterval(poll, 8000)
    return () => clearInterval(t)
  }, [ready, poll])

  async function loadOlder() {
    if (loadingOld || !hasMore || msgs.length === 0) return
    setLoadingOld(true)
    const el = boxRef.current
    keepScroll.current = el ? el.scrollHeight - el.scrollTop : null
    const { data } = await supabase.rpc('offer_chat_page', { p_offer: offerId, p_as: asId, p_before: msgs[0].created_at, p_limit: PAGE })
    setHasMore((data || []).length >= PAGE)
    setMsgs(prev => merge(data || [], prev))
    setLoadingOld(false)
  }

  // Scrollposition: beim Öffnen zur "Neu"-Linie bzw. ganz nach unten; nach Nachladen an gleicher Stelle bleiben
  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el || !ready) return
    if (keepScroll.current != null) { el.scrollTop = el.scrollHeight - keepScroll.current; keepScroll.current = null; return }
    const newest = msgs[msgs.length - 1]?.id
    if (firstScroll.current) {
      firstScroll.current = false
      const marker = el.querySelector('[data-neu]')
      if (marker && marker.offsetTop > el.clientHeight / 2) el.scrollTop = marker.offsetTop - 40
      else el.scrollTop = el.scrollHeight
    } else if (newest !== newestRef.current && atBottom.current) {
      el.scrollTop = el.scrollHeight
    }
    newestRef.current = newest
  }, [msgs, ready])

  function onScroll() {
    const el = boxRef.current
    if (!el) return
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60
    if (bottom && !atBottom.current) { setUnseen(0); markRead() }
    atBottom.current = bottom
    setAway(!bottom)
    if (el.scrollTop < 80) loadOlder()
  }

  async function send(e) {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('send_offer_message', { p_offer: offerId, p_body: text, p_as: asId })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setText(''); atBottom.current = true
    await poll(); scrollToBottom(true); markRead()
    notifyOfferPush(offerId, asId, 'chat')
  }

  // Index der ersten ungelesenen fremden Nachricht -> "Neu"-Linie
  const firstNew = lastRead ? msgs.findIndex(m => !m.mine && new Date(m.created_at) > new Date(lastRead)) : -1

  const wrap = embedded ? {} : { background: 'var(--card)', borderRadius: 14, padding: 20, marginBottom: 24 }
  return (
    <div style={wrap}>
      {!embedded && <div style={{ fontWeight: 700, marginBottom: 12 }}>💬 Gruppen-Chat</div>}

      {ankuendigung && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#FFF4DC', border: '1.5px solid var(--gold,#E9AD55)', borderRadius: 10, padding: '8px 12px', marginBottom: 10, fontSize: 13, color: '#173F4A' }}>
          <span aria-hidden>📌</span>
          <div style={{ minWidth: 0 }}><strong>Ankündigung</strong><div style={{ whiteSpace: 'pre-wrap' }}>{ankuendigung}</div></div>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <div ref={boxRef} onScroll={onScroll} style={{ height: 'min(60vh, 460px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, paddingRight: 4 }}>
          {hasMore && (
            <button onClick={loadOlder} disabled={loadingOld} style={{ alignSelf: 'center', fontSize: 12, padding: '4px 10px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--muted)', cursor: 'pointer', marginBottom: 4 }}>
              {loadingOld ? 'Lädt …' : 'Ältere Nachrichten laden'}
            </button>
          )}
          {ready && msgs.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', margin: 'auto' }}>Noch keine Nachrichten. Sag Hallo 👋</div>}
          {!ready && <div style={{ fontSize: 13, color: 'var(--muted)', margin: 'auto' }}>Lädt …</div>}
          {msgs.map((m, i) => {
            const prev = msgs[i - 1]
            const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at)
            const sameSender = prev && !newDay && prev.sender_name === m.sender_name && i !== firstNew
            const hue = [...(m.sender_name || '')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7)
            const nameColor = m.mine ? 'rgba(255,255,255,.95)' : `hsl(${hue},55%,35%)`
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column' }}>
                {newDay && (
                  <div style={{ position: 'sticky', top: 0, zIndex: 1, alignSelf: 'center', fontSize: 11, fontWeight: 600, color: 'var(--muted)', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 10px', margin: '8px 0 4px' }}>{dayLabel(m.created_at)}</div>
                )}
                {i === firstNew && (
                  <div data-neu style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0', color: '#c0392b', fontSize: 11, fontWeight: 700 }}>
                    <div style={{ flex: 1, height: 1, background: '#c0392b' }} /> Neu seit deinem letzten Besuch <div style={{ flex: 1, height: 1, background: '#c0392b' }} />
                  </div>
                )}
                <div style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '85%', background: m.mine ? 'var(--g)' : 'var(--bg)', color: m.mine ? 'white' : 'var(--text)', border: m.mine ? 'none' : '1px solid var(--border)', borderRadius: 12, padding: '7px 12px', fontSize: 14, wordBreak: 'break-word', marginTop: sameSender ? -2 : 2 }}>
                  {!sameSender && <div style={{ fontSize: 12, fontWeight: 700, color: nameColor, marginBottom: 2 }}>{m.mine ? `Du (${m.sender_name})` : m.sender_name}{m.from_kommune ? ' · Kommune' : ''}</div>}
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                  <div style={{ fontSize: 10, opacity: .6, marginTop: 2, textAlign: 'right' }}>{new Date(m.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            )
          })}
        </div>
        {ready && (unseen > 0 || away) && msgs.length > 0 && (
          <button onClick={() => { scrollToBottom(true); markRead() }} aria-label="Zu den neuesten Nachrichten" style={{ position: 'absolute', right: 10, bottom: 22, borderRadius: 20, border: 'none', background: 'var(--g)', color: 'white', fontSize: 12, fontWeight: 700, padding: '7px 12px', boxShadow: '0 2px 8px rgba(0,0,0,.2)', cursor: 'pointer' }}>
            ↓ {unseen > 0 ? `${unseen} neu` : 'Neueste'}
          </button>
        )}
      </div>

      <form onSubmit={send} style={{ display: 'flex', gap: 8 }}>
        <input value={text} onChange={e => setText(e.target.value)} maxLength={2000} placeholder="Nachricht an die Gruppe…" style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }} />
        <button type="submit" disabled={busy || !text.trim()} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: 'var(--g)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Senden</button>
      </form>
      {err && <p style={{ color: '#c0392b', fontSize: 13, margin: '8px 0 0' }}>{err}</p>}
    </div>
  )
}
