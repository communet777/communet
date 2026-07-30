import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../../components/Nav'
import { supabase } from '../../../lib/supabase'
import { getTypIcon, getTypBadge } from '../../../data/communities'
import styles from '../../../styles/KommuneProfil.module.css'

export default function OeffentlichesKommuneProfil() {
  const router = useRouter()
  const { id } = router.query
  const [k, setK] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    supabase.from('profiles')
      .select('*')
      .eq('id', id)
      .eq('typ', 'kommune')
      .eq('status', 'approved')
      .single()
      .then(({ data }) => { setK(data); setLoading(false) })
  }, [id])

  if (loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:32,height:32,border:'3px solid #eee',borderTopColor:'#2d6a4f',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/></div>
  if (!k) return <div><Nav/><div style={{padding:48,textAlign:'center',color:'var(--muted)'}}>— Profil nicht gefunden. <Link href="/kommunen" style={{color:'var(--g)'}}>Zurück</Link></div></div>

  const typ = k.kommune_typ || 'Kommune'
  const since = k.gruendungsjahr ? `Gegründet ${k.gruendungsjahr}` : null

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
        <div className={styles.statusBadge} style={{background:'#e8f5ee',color:'#2d6a4f'}}>
          🟢 Auf Communet
        </div>
      </div>

      <div className={styles.profileHeader}>
        <div>
          <h1 className={styles.name}>{k.name}</h1>
          <div className={styles.meta}>
            <span className={`badge ${getTypBadge(typ)}`}>{typ}</span>
            {k.land && <span className={styles.loc}>📍 {k.land}</span>}
            {since && <span className={styles.founded}>{since}</span>}
          </div>
        </div>
        <div className={styles.actions}>
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
        </div>
        <div className={styles.sidebar}>
          <div className={styles.sideCard}>
            <div className={styles.sideTitle}>🟢 Auf Communet</div>
            {k.website && <a href={k.website} target="_blank" rel="noopener noreferrer" style={{display:'block',fontSize:13,color:'var(--g)',marginTop:8}}>🔗 Zur Website</a>}
            {k.instagram && <a href={`https://instagram.com/${k.instagram}`} target="_blank" rel="noopener noreferrer" style={{display:'block',fontSize:13,color:'var(--g)',marginTop:4}}>📸 @{k.instagram}</a>}
          </div>
        </div>
      </div>
    </div>
  )
}
