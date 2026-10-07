import TypIcon from '../../components/TypIcon'
import Icon from'../../components/Icon'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../components/Nav'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { useActiveProfile } from '../../lib/ActiveProfileContext'
import MessageBox from '../../components/MessageBox'
import OfferChat from '../../components/OfferChat'

export default function AngebotDetail() {
  const router = useRouter()
  const { id } = router.query
  const { user } = useAuth()
  const { earlyAccess, active } = useActiveProfile()
  const [interest, setInterest] = useState(null)
  const [offer, setOffer] = useState(null)
  const [kommune, setKommune] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    supabase.from('offers').select('*').eq('id', id).single()
      .then(async ({ data }) => {
        if (!data) { setLoading(false); return }
        setOffer(data)
        const { data: k } = await supabase.from('profiles')
          .select('id, name, avatar_url, kommune_typ, land, bio, website, instagram')
          .eq('id', data.kommune_id).single()
        setKommune(k)
        setLoading(false)
      })
  }, [id])

  async function loadInterest() {
    const { data } = await supabase.rpc('offer_interest_info', { p_offer: id, p_as: active?.id })
    setInterest(data || null)
  }
  useEffect(() => { if (id && user && earlyAccess && active) loadInterest() }, [id, user, earlyAccess, active?.id])
  async function toggleInterest() {
    if (interest?.mine) {
      if (interest.my_status === 'angenommen' && !window.confirm('Teilnahme wirklich zurückziehen? Du verlierst den Zugang zum Gruppen-Chat.')) return
      await supabase.from('offer_interest').delete().eq('offer_id', id).eq('user_id', user.id)
    } else await supabase.from('offer_interest').insert({ offer_id: id, user_id: user.id })
    loadInterest()
  }
  async function setStatus(uid, status) {
    await supabase.rpc('offer_set_status', { p_offer: id, p_user: uid, p_status: status, p_as: active?.id })
    loadInterest()
  }
  const LABEL = { angefragt: '⏳ Angefragt', angenommen: '✓ Angenommen', abgelehnt: '✕ Abgelehnt' }
  const conditions = offer ? [
    ['Vergütung', [offer.verguetung, offer.verguetung_info].filter(Boolean).join(' – ')],
    ['Unterkunft', offer.unterkunft],
    ['Verpflegung', offer.verpflegung],
  ].filter(c => c[1]) : []

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:32,height:32,border:'3px solid #eee',borderTopColor:'#173F4A',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>
  if (!offer) return <div><Nav/><div style={{padding:48,textAlign:'center',color:'var(--muted)'}}>— Angebot nicht gefunden. <Link href="/angebote" style={{color:'var(--g)'}}>Zurück</Link></div></div>

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      <Nav/>
      <div style={{maxWidth:680,margin:'0 auto',padding:'32px 20px 80px'}}>

        <Link href="/angebote" style={{fontSize:13,color:'var(--muted)',textDecoration:'none',display:'inline-block',marginBottom:20}}>← Alle Angebote</Link>

        {/* Badge + Datum */}
        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:12,flexWrap:'wrap'}}>
          <span style={{fontSize:12,fontWeight:600,background:'#E1ECEE',color:'var(--g)',padding:'3px 10px',borderRadius:20}}>{offer.typ}</span>
          {offer.datum && (
            <span style={{fontSize:12,color:'var(--muted)',background:'var(--card)',padding:'3px 10px',borderRadius:20}}>
              📅 {new Date(offer.datum).toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}
              {offer.uhrzeit ? ' · ' + offer.uhrzeit.slice(0,5) + ' Uhr' : ''}
            </span>
          )}
          {!offer.datum && offer.von && (
            <span style={{fontSize:12,color:'var(--muted)',background:'var(--card)',padding:'3px 10px',borderRadius:20}}>
              {new Date(offer.von).toLocaleDateString('de-DE',{day:'2-digit',month:'long'})}
              {offer.bis ? ' – ' + new Date(offer.bis).toLocaleDateString('de-DE',{day:'2-digit',month:'long'}) : ''}
            </span>
          )}
        </div>

        {/* Titel */}
        <h1 style={{fontSize:28,fontWeight:800,color:'var(--text)',margin:'0 0 12px',lineHeight:1.2}}>{offer.titel}</h1>

        {/* Ort */}
        {offer.ort && (
          <div style={{fontSize:14,color:'var(--muted)',marginBottom:20}}><Icon name="standort"/> {offer.ort}</div>
        )}

        {/* Beschreibung */}
        {offer.beschreibung && (
          <div style={{background:'var(--card)',borderRadius:14,padding:24,marginBottom:24}}>
            <p style={{fontSize:15,color:'var(--text)',lineHeight:1.7,margin:0,whiteSpace:'pre-wrap'}}>{offer.beschreibung}</p>
          </div>
        )}

        {(conditions.length > 0 || offer.kosten_info) && (
          <div style={{background:'var(--card)',borderRadius:14,padding:20,marginBottom:24}}>
            <div style={{fontWeight:700,marginBottom:10}}>Konditionen</div>
            {conditions.map(([k, v]) => <div key={k} style={{fontSize:14,marginBottom:6}}><strong>{k}:</strong> {v}</div>)}
            {offer.kosten_info && <div style={{fontSize:14,color:'var(--muted)',whiteSpace:'pre-wrap',marginTop:6}}>{offer.kosten_info}</div>}
          </div>
        )}

        {user && earlyAccess && interest && (
          <div style={{background:'var(--card)',borderRadius:14,padding:20,marginBottom:24}}>
            {interest.role === 'owner' ? (
              <div>
                <div style={{fontWeight:700,marginBottom:10}}>Anfragen ({interest.requests?.length || 0})</div>
                {(!interest.requests || interest.requests.length === 0) && <div style={{fontSize:13,color:'var(--muted)'}}>Noch keine Anfragen.</div>}
                {interest.requests?.map(r => (
                  <div key={r.user_id} style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',padding:'8px 0',borderTop:'1px solid var(--border)'}}>
                    <Link href={`/leute/${r.user_id}`} style={{flex:1,minWidth:120,color:'var(--text)',fontWeight:600,textDecoration:'none'}}>{r.name}</Link>
                    <span style={{fontSize:12,color:'var(--muted)'}}>{LABEL[r.status]}</span>
                    {r.status !== 'angenommen' && <button onClick={()=>setStatus(r.user_id,'angenommen')} style={{padding:'6px 12px',borderRadius:8,border:'none',background:'var(--g)',color:'white',fontSize:12,fontWeight:600,cursor:'pointer'}}>Freischalten</button>}
                    {r.status !== 'abgelehnt' && <button onClick={()=>setStatus(r.user_id,'abgelehnt')} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid var(--border)',background:'transparent',color:'var(--muted)',fontSize:12,cursor:'pointer'}}>{r.status === 'angenommen' ? 'Entfernen' : 'Ablehnen'}</button>}
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
                  <button onClick={toggleInterest} style={{padding:'10px 18px',borderRadius:10,border:'1.5px solid var(--g)',background:interest.mine?'var(--g)':'transparent',color:interest.mine?'white':'var(--g)',fontWeight:600,cursor:'pointer'}}>{interest.mine ? 'Anfrage zurückziehen' : 'Teilnahme anfragen'}</button>
                  {interest.mine && <span style={{fontSize:13,fontWeight:600}}>{LABEL[interest.my_status]}</span>}
                </div>
                {interest.my_status === 'abgelehnt' && <div style={{fontSize:13,color:'var(--muted)',marginTop:8}}>Die Kommune hat diese Anfrage leider abgelehnt.</div>}
                {interest.my_status === 'angefragt' && <div style={{fontSize:13,color:'var(--muted)',marginTop:8}}>Die Kommune muss dich noch freischalten.</div>}
                {kommune && <div style={{marginTop:14}}><MessageBox toId={kommune.id} label="Der Kommune schreiben" defaultText={`Hallo, ich interessiere mich für „${offer.titel}“. `}/></div>}
              </div>
            )}
          </div>
        )}

        {interest?.participants?.length > 0 && (
          <div style={{background:'var(--card)',borderRadius:14,padding:20,marginBottom:24}}>
            <div style={{fontWeight:700,marginBottom:8}}>Teilnehmende ({interest.participants.length})</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {interest.participants.map(p => <Link key={p.user_id} href={`/leute/${p.user_id}`} style={{fontSize:13,background:'var(--bg)',border:'1px solid var(--border)',borderRadius:20,padding:'4px 12px',color:'var(--text)',textDecoration:'none'}}>{p.name}</Link>)}
            </div>
          </div>
        )}

        {interest?.role && <OfferChat offerId={id} asId={active?.id}/>}

        {/* Kommune-Info */}
        {kommune && (
          <div style={{background:'var(--card)',borderRadius:14,padding:20,display:'flex',gap:16,alignItems:'center'}}>
            <div style={{width:52,height:52,borderRadius:'50%',overflow:'hidden',border:'2px solid var(--border)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',fontSize:24}}>
              {kommune.avatar_url
                ? <img src={kommune.avatar_url} alt={kommune.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : <TypIcon typ={kommune.kommune_typ} size={30}/>
              }
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--muted)',marginBottom:2}}>Angebot von</div>
              <div style={{fontSize:16,fontWeight:700,color:'var(--text)'}}>{kommune.name}</div>
              {kommune.land && <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}><Icon name="standort"/> {kommune.land}</div>}
            </div>
            <Link href={`/profil/p/${kommune.id}`} style={{padding:'8px 16px',background:'var(--g)',color:'white',borderRadius:10,fontSize:13,fontWeight:600,textDecoration:'none',flexShrink:0}}>
              Profil ansehen
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
