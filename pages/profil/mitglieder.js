import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../components/Nav'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import { notifyMemberPush } from '../../lib/push'
import styles from '../../styles/ProfilBearbeiten.module.css'

// Mitglieder einer Gemeinschaft verwalten. Zwei Ebenen:
//  Bewohner = lebt dort, ist Teil der Gemeinschaft und verwaltet mit (Profil, Angebote, Mitglieder)
//  Gast     = nur zu Gast, sieht die Gemeinschaft und ihre Angebote, verwaltet nichts
const ROLLEN = [
  { value: 'bewohner', label: 'Bewohner', desc: 'Lebt dort, verwaltet mit' },
  { value: 'gast', label: 'Gast', desc: 'Nur zu Gast, sieht mit' },
]

export default function Mitglieder() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pid = typeof router.query.id === 'string' ? router.query.id : null
  const [name, setName] = useState('')
  const [members, setMembers] = useState([])
  const [allowed, setAllowed] = useState(null)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState([])
  const [msg, setMsg] = useState('')

  useEffect(() => { if (!loading && !user) router.replace('/auth/login') }, [user, loading])

  async function loadMembers() {
    const { data, error } = await supabase.rpc('kommune_members_roles', { p_kommune: pid })
    if (error) { setMsg(error.message); return }
    setMembers(data || [])
  }

  async function search(text) {
    const { data, error } = await supabase.rpc('search_people', { p_q: text })
    if (error) { setMsg(error.message); return }
    setHits(data || [])
  }

  useEffect(() => {
    if (!user || !pid) return
    supabase.from('profiles').select('name,owner_id').eq('id', pid).eq('typ', 'kommune').single().then(async ({ data }) => {
      if (!data) { setAllowed(false); return }
      setName(data.name || '')
      // Verwalten darf, wer Besitzer oder Bewohner ist; die Datenbank liefert die Liste nur diesen Personen.
      const { data: list, error } = await supabase.rpc('kommune_members_roles', { p_kommune: pid })
      const isOwner = data.owner_id === user.id
      const isBewohner = (list || []).some(m => m.user_id === user.id && m.rolle === 'bewohner')
      setAllowed(isOwner || isBewohner || !error && (list || []).length > 0)
      setMembers(list || [])
      search('')
    })
  }, [user, pid])

  async function add(h, rolle) {
    const { error } = await supabase.from('kommune_members').insert({ kommune_id: pid, user_id: h.id, rolle })
    if (error) { setMsg('Hinzufügen fehlgeschlagen: ' + error.message); return }
    setMsg('')
    notifyMemberPush(pid, h.id)
    setMembers(m => [...m, { user_id: h.id, name: h.name, avatar_url: h.avatar_url, rolle }])
  }

  async function setRolle(userId, rolle) {
    const { error } = await supabase.from('kommune_members').update({ rolle }).eq('kommune_id', pid).eq('user_id', userId)
    if (error) { setMsg('Ändern fehlgeschlagen: ' + error.message); return }
    setMsg('')
    setMembers(m => m.map(x => x.user_id === userId ? { ...x, rolle } : x))
  }

  async function remove(userId) {
    const { error } = await supabase.from('kommune_members').delete().eq('kommune_id', pid).eq('user_id', userId)
    if (error) { setMsg('Entfernen fehlgeschlagen: ' + error.message); return }
    setMembers(m => m.filter(x => x.user_id !== userId))
  }

  if (loading || !user) return <div className={styles.loading}><div className={styles.spinner}/></div>

  const card = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--card)', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }
  const btn = { border: 'none', background: 'var(--g)', color: 'white', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }
  const btnLight = { ...btn, background: 'none', color: 'var(--g)', border: '1px solid var(--border)' }
  const free = hits.filter(h => !members.some(m => m.user_id === h.id))

  return (
    <div className={styles.page}>
      <Nav/>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/profil" className={styles.back}>← Profil</Link>
          <h1 className={styles.title}>Mitglieder{name ? ` – ${name}` : ''}</h1>
        </div>

        {allowed === false && <p style={{color:'var(--muted)'}}>Diese Gemeinschaft wurde nicht gefunden oder du darfst sie nicht verwalten.</p>}

        {allowed && (
          <div>
            <div style={{background:'var(--card)',borderRadius:12,padding:'12px 14px',fontSize:13,color:'var(--muted)',marginBottom:20,lineHeight:1.6}}>
              <strong style={{color:'var(--text)'}}>Zwei Ebenen:</strong><br/>
              <strong>Bewohner</strong> leben dort und sind Teil der Gemeinschaft. Sie verwalten mit: Profil, Angebote und Mitglieder.<br/>
              <strong>Gast</strong> sind nur zu Gast, sehen die Gemeinschaft und ihre Angebote und verwalten nichts.
            </div>

            <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>Aktuelle Mitglieder ({members.length})</div>
            {members.length === 0 && <p style={{color:'var(--muted)',fontSize:13}}>Noch niemand hinzugefügt.</p>}
            {members.map(m => (
              <div key={m.user_id} style={card}>
                <span>{m.name}</span>
                <span style={{display:'flex',gap:8,alignItems:'center'}}>
                  <select value={m.rolle} onChange={e => setRolle(m.user_id, e.target.value)} aria-label="Rolle" style={{padding:'6px 10px',borderRadius:8,border:'1.5px solid var(--border)',background:'var(--bg)',color:'var(--text)',fontSize:13}}>
                    {ROLLEN.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <button type="button" onClick={() => remove(m.user_id)} aria-label="Entfernen" style={{border:'none',background:'none',color:'var(--muted)',cursor:'pointer',fontSize:18}}>×</button>
                </span>
              </div>
            ))}

            <div style={{fontSize:13,fontWeight:600,margin:'24px 0 8px'}}>Person hinzufügen</div>
            <input type="text" value={q} onChange={e => { setQ(e.target.value); search(e.target.value) }} placeholder="Name suchen" style={{width:'100%',marginBottom:12}}/>
            {msg && <p style={{color:'#b3261e',fontSize:13}}>{msg}</p>}
            {free.length === 0 && <p style={{color:'var(--muted)',fontSize:13}}>Keine weiteren Personen gefunden. Die Person muss sich zuerst mit einem Early-Access-Code registrieren und „auffindbar“ sein.</p>}
            {free.map(h => (
              <div key={h.id} style={card}>
                <span>{h.name}</span>
                <span style={{display:'flex',gap:8}}>
                  <button type="button" onClick={() => add(h, 'bewohner')} style={btn}>Als Bewohner</button>
                  <button type="button" onClick={() => add(h, 'gast')} style={btnLight}>Als Gast</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
