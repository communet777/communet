import { useState } from 'react'
import Link from 'next/link'
import Nav from '../../components/Nav'
import { useLang } from '../../lib/LanguageContext'
import { COMMUNITIES, TYPEN, getTypBadge, getStatusInfo } from '../../data/communities'
import styles from '../../styles/Kommunen.module.css'

export default function Kommunen() {
  const { t } = useLang()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('alle')
  const [statusFilter, setStatusFilter] = useState('alle')

  const filtered = COMMUNITIES.filter(k => {
    const matchTyp = filter === 'alle' || k.typ === filter
    const matchStatus = statusFilter === 'alle' || k.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q || k.name.toLowerCase().includes(q) || k.ort.toLowerCase().includes(q) || k.land.toLowerCase().includes(q)
    return matchTyp && matchStatus && matchSearch
  })

  return (
    <div>
      <Nav />
      <div className={styles.header}>
        <h1 className={styles.title}>{t('communities_title')}</h1>
        <p className={styles.sub}>{t('communities_sub')}</p>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input type="text" className={styles.search} placeholder={t('communities_search')}
            value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className={styles.pills}>
          <button className={`${styles.pill} ${filter==='alle'?styles.active:''}`} onClick={()=>setFilter('alle')}>{t('communities_all')}</button>
          {TYPEN.map(typ=>(
            <button key={typ} className={`${styles.pill} ${filter===typ?styles.active:''}`} onClick={()=>setFilter(typ)}>
              {typ==='Spirituelle Gemeinschaft'?'Spirituell':typ}
            </button>
          ))}
        </div>
        <div className={styles.pills}>
          <button className={`${styles.pill} ${statusFilter==='alle'?styles.activeStatus:''}`} onClick={()=>setStatusFilter('alle')}>All</button>
          <button className={`${styles.pill} ${statusFilter==='aktiv'?styles.activeStatus:''}`} onClick={()=>setStatusFilter('aktiv')}>{t('communities_active')}</button>
          <button className={`${styles.pill} ${statusFilter==='nicht-registriert'?styles.activeStatus:''}`} onClick={()=>setStatusFilter('nicht-registriert')}>{t('communities_inactive')}</button>
        </div>
      </div>
      <div className={styles.resultsBar}>{filtered.length} {filtered.length===1?t('communities_found'):t('communities_found')+t('communities_all').slice(-1)==='n'?'en':''}</div>
      <div className={styles.grid}>
        {filtered.length===0 ? <div className={styles.empty}>—</div> :
        filtered.map(k => {
          const status = getStatusInfo(k.status)
          const isInactive = k.status==='nicht-registriert'
          return (
            <Link href={`/kommunen/${k.id}`} key={k.id} className={`${styles.card} ${isInactive?styles.cardInactive:''}`}>
              <div className={styles.cardImg} style={{background:k.typ==='Kommune'?'#fff3e0':k.typ==='Kollektiv'?'#e8eaf6':'#e8f5ee',opacity:isInactive?0.6:1}}>
                <span style={{fontSize:32,filter:isInactive?'grayscale(80%)':'none'}}>{k.icon}</span>
              </div>
              <div className={styles.cardBody}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6,gap:4}}>
                  <span className={`badge ${getTypBadge(k.typ)}`} style={{opacity:isInactive?0.6:1}}>
                    {k.typ==='Spirituelle Gemeinschaft'?'Spirituell':k.typ}
                  </span>
                  <span style={{fontSize:10,color:status.color,background:status.bg,padding:'2px 6px',borderRadius:10,whiteSpace:'nowrap',flexShrink:0}}>
                    {isInactive?`⚫ ${t('status_inactive')}`:`🟢 ${t('status_active')}`}
                  </span>
                </div>
                <div className={styles.cardName} style={{color:isInactive?'var(--muted)':'var(--text)'}}>{k.name}</div>
                <div className={styles.cardLoc}>📍 {k.ort} · {k.land}</div>
                <div className={styles.cardFooter}>
                  <span>👥 ~{k.members}</span>
                  {isInactive?<span style={{fontSize:11,color:'var(--muted)'}}>{t('communities_invite')}</span>
                  :<span style={{color:'var(--g)',fontWeight:500,fontSize:11}}>{k.angebote} {t('nav_offers').toLowerCase()}</span>}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
