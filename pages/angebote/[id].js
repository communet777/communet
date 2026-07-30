import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../components/Nav'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

export default function AngebotDetail() {
  const router = useRouter()
  const { id } = router.query
  const { user } = useAuth()
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

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:32,height:32,border:'3px solid #eee',borderTopColor:'#2d6a4f',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>
  if (!offer) return <div><Nav/><div style={{padding:48,textAlign:'center',color:'var(--muted)'}}>— Angebot nicht gefunden. <Link href="/angebote" style={{color:'var(--g)'}}>Zurück</Link></div></div>

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      <Nav/>
      <div style={{maxWidth:680,margin:'0 auto',padding:'32px 20px 80px'}}>

        <Link href="/angebote" style={{fontSize:13,color:'var(--muted)',textDecoration:'none',display:'inline-block',marginBottom:20}}>← Alle Angebote</Link>

        {/* Badge + Datum */}
        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:12,flexWrap:'wrap'}}>
          <span style={{fontSize:12,fontWeight:600,background:'#e8f5ee',color:'var(--g)',padding:'3px 10px',borderRadius:20}}>{offer.typ}</span>
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
          <div style={{fontSize:14,color:'var(--muted)',marginBottom:20}}>📍 {offer.ort}</div>
        )}

        {/* Beschreibung */}
        {offer.beschreibung && (
          <div style={{background:'var(--card)',borderRadius:14,padding:24,marginBottom:24}}>
            <p style={{fontSize:15,color:'var(--text)',lineHeight:1.7,margin:0,whiteSpace:'pre-wrap'}}>{offer.beschreibung}</p>
          </div>
        )}

        {/* Kommune-Info */}
        {kommune && (
          <div style={{background:'var(--card)',borderRadius:14,padding:20,display:'flex',gap:16,alignItems:'center'}}>
            <div style={{width:52,height:52,borderRadius:'50%',overflow:'hidden',border:'2px solid var(--border)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',fontSize:24}}>
              {kommune.avatar_url
                ? <img src={kommune.avatar_url} alt={kommune.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : '🏡'
              }
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:'var(--muted)',marginBottom:2}}>Angebot von</div>
              <div style={{fontSize:16,fontWeight:700,color:'var(--text)'}}>{kommune.name}</div>
              {kommune.land && <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>📍 {kommune.land}</div>}
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
