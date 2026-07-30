import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../../components/Nav'
import { supabase } from '../../../lib/supabase'
import { getTypIcon, getTypBadge } from '../../../data/communities'
import FavoriteBtn from '../../../components/FavoriteBtn'
import styles from '../../../styles/KommuneProfil.module.css'

export default function OeffentlichesKommuneProfil() {
  const router = useRouter()
  const { id } = router.query
  const [k, setK] = useState(null)
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    supabase.from('profiles')
      .select('*').eq('id', id).eq('typ', 'kommune').eq('status', 'approved').single()
      .then(({ data }) => { setK(data); setLoading(false) })
    supabase.from('offers')
      .select('*').eq('kommune_id', id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setOffers(data) })
  }, [id])

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:32,height:32,border:'3px solid #eee',borderTopColor:'#2d6a4f',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>
  if (!k) return <div><Nav/><div style={{padding:48,textAlign:'center',color:'var(--muted)'}}>— Profil nicht gefunden. <Link href="/kommunen" style={{color:'var(--g)'}}>Zurück</Link></div></div>

  const typ = k.kommune_typ || 'Kommune'

  return (
    <div>
      <Nav/>
      <div className={styles.banner}>
        <div className={styles.bannerPattern}/>
        <div className={styles.avatar}>
          {k.avatar_url
            ? <img src={k.avatar_url} alt={k.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
            : getTypIcon(typ)
          }
        </div>
        <div className={styles.statusBadge} style={{background:'#e8f5ee',color:'#2d6a4f'}}>🟢 Auf Communet</div>
      </div>

      <div className={styles.profileHeader}>
        <div>
          <h1 className={styles.name}>{k.name}</h1>
          <div className={styles.meta}>
            <span className={`badge ${getTypBadge(typ)}`}>{typ}</span>
            {k.land && <span className={styles.loc}>📍 {k.land}</span>}
            {k.gruendungsjahr && <span className={styles.founded}>Gegründet {k.gruendungsjahr}</span>}
          </div>
        </div>
        <div className={styles.actions} style={{display:'flex',alignItems:'center',gap:12}}>
          <FavoriteBtn communityId={String(id)}/>
          {k.website && <a href={k.website} target="_blank" rel="noopener noreferrer" className="btn-secondary">🔗 Website</a>}
        </div>
      </div>

      <div className={styles.statsRow}>
        {k.mitglieder && <div className={styles.statCell}><div className={styles.statN}>{k.mitglieder}</div><div className={styles.statL}>Mitglieder</div></div>}
        {k.gruendungsjahr && <div className={styles.statCell}><div className={styles.statN}>{k.gruendungsjahr}</div><div className={styles.statL}>Gegründet</div></div>}
        {k.instagram && <div className={styles.statCell}><div className={styles.statN}>📸</div><div className={styles.statL}>@{k.instagram}</div></div>}
      </div>

      <div className={styles.content}>
        <div className={styles.main}>
          {k.bio && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Beschreibung</div>
              <p className={styles.desc}>{k.bio}</p>
            </div>
          )}

          {offers.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>✨ Angebote & Veranstaltungen</div>
              {offers.map(o => (
                <Link key={o.id} href={`/angebote/${o.id}`} style={{textDecoration:'none'}}>
                  <div style={{background:'var(--bg)',border:'1.5px solid var(--border)',borderLeft:'3px solid var(--g)',borderRadius:10,padding:'12px 16px',marginBottom:10,cursor:'pointer'}}>
                    <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:4,flexWrap:'wrap'}}>
                      <span style={{fontSize:11,fontWeight:600,background:'#e8f5ee',color:'var(--g)',padding:'2px 8px',borderRadius:20}}>{o.typ}</span>
                      {o.datum && <span style={{fontSize:11,color:'var(--muted)'}}>📅 {new Date(o.datum).toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'short'})}{o.uhrzeit?' · '+o.uhrzeit.slice(0,5)+' Uhr':''}</span>}
                      {!o.datum && o.von && <span style={{fontSize:11,color:'var(--muted)'}}>{new Date(o.von).toLocaleDateString('de-DE',{day:'2-digit',month:'short'})}{o.bis?' – '+new Date(o.bis).toLocaleDateString('de-DE',{day:'2-digit',month:'short'}):''}</span>}
                    </div>
                    <div style={{fontSize:15,fontWeight:700,color:'var(--text)'}}>{o.titel}</div>
                    {o.ort && <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>📍 {o.ort}</div>}
                    {o.beschreibung && <p style={{fontSize:13,color:'var(--muted)',marginTop:6,lineHeight:1.5,margin:'6px 0 0'}}>{o.beschreibung.slice(0,100)}{o.beschreibung.length>100?'…':''}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className={styles.sidebar}>
          <div className={styles.sideCard}>
            <div className={styles.sideTitle}>♡ Folgen</div>
            <FavoriteBtn communityId={String(id)}/>
            {k.website && <a href={k.website} target="_blank" rel="noopener noreferrer" style={{display:'block',fontSize:13,color:'var(--g)',marginTop:8}}>🔗 Zur Website</a>}
            {k.instagram && <a href={`https://instagram.com/${k.instagram}`} target="_blank" rel="noopener noreferrer" style={{display:'block',fontSize:13,color:'var(--g)',marginTop:4}}>📸 @{k.instagram}</a>}
          </div>
        </div>
      </div>
    </div>
  )
}
