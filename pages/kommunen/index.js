import { useState } from 'react'
import Link from 'next/link'
import Nav from '../../components/Nav'
import { COMMUNITIES, TYPEN, getTypBadge, getStatusInfo } from '../../data/communities'
import styles from '../../styles/Kommunen.module.css'

export default function Kommunen() {
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

  const aktiveCount = COMMUNITIES.filter(k => k.status === 'aktiv').length
  const nichtRegistriert = COMMUNITIES.filter(k => k.status === 'nicht-registriert').length

  return (
    <div>
      <Nav />

      <div className={styles.header}>
        <h1 className={styles.title}>Gemeinschaften entdecken</h1>
        <p className={styles.sub}>{COMMUNITIES.length} Gemeinschaften in 23 Ländern · {aktiveCount} aktiv auf Communet · {nichtRegistriert} noch nicht registriert</p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.search}
            placeholder="Name, Ort oder Land …"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.pills}>
          <button className={`${styles.pill} ${filter === 'alle' ? styles.active : ''}`} onClick={() => setFilter('alle')}>Alle Typen</button>
          {TYPEN.map(t => (
            <button key={t} className={`${styles.pill} ${filter === t ? styles.active : ''}`} onClick={() => setFilter(t)}>
              {t === 'Spirituelle Gemeinschaft' ? 'Spirituell' : t}
            </button>
          ))}
        </div>
        <div className={styles.pills}>
          <button className={`${styles.pill} ${statusFilter === 'alle' ? styles.activeStatus : ''}`} onClick={() => setStatusFilter('alle')}>Alle Status</button>
          <button className={`${styles.pill} ${statusFilter === 'aktiv' ? styles.activeStatus : ''}`} onClick={() => setStatusFilter('aktiv')}>🟢 Aktiv</button>
          <button className={`${styles.pill} ${statusFilter === 'einrichtung' ? styles.activeStatus : ''}`} onClick={() => setStatusFilter('einrichtung')}>🟡 In Einrichtung</button>
          <button className={`${styles.pill} ${statusFilter === 'nicht-registriert' ? styles.activeStatus : ''}`} onClick={() => setStatusFilter('nicht-registriert')}>⚫ Nicht registriert</button>
        </div>
      </div>

      <div className={styles.resultsBar}>{filtered.length} Gemeinschaft{filtered.length !== 1 ? 'en' : ''} gefunden</div>

      <div className={styles.grid}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>Keine Gemeinschaft gefunden — andere Suchbegriffe versuchen?</div>
        ) : filtered.map(k => {
          const status = getStatusInfo(k.status)
          const isInactive = k.status === 'nicht-registriert'
          return (
            <Link href={`/kommunen/${k.id}`} key={k.id} className={`${styles.card} ${isInactive ? styles.cardInactive : ''}`}>
              <div className={styles.cardImg} style={{
                background: k.typ === 'Kommune' ? '#fff3e0' : k.typ === 'Kollektiv' ? '#e8eaf6' : '#e8f5ee',
                opacity: isInactive ? 0.6 : 1
              }}>
                <span style={{fontSize:32, filter: isInactive ? 'grayscale(80%)' : 'none'}}>{k.icon}</span>
              </div>
              <div className={styles.cardBody}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6,gap:4}}>
                  <span className={`badge ${getTypBadge(k.typ)}`} style={{opacity: isInactive ? 0.6 : 1}}>
                    {k.typ === 'Spirituelle Gemeinschaft' ? 'Spirituell' : k.typ}
                  </span>
                  <span style={{fontSize:10,color:status.color,background:status.bg,padding:'2px 6px',borderRadius:10,whiteSpace:'nowrap',flexShrink:0}}>
                    {status.icon} {isInactive ? 'Nicht registriert' : status.label}
                  </span>
                </div>
                <div className={styles.cardName} style={{color: isInactive ? 'var(--muted)' : 'var(--text)'}}>{k.name}</div>
                <div className={styles.cardLoc}>📍 {k.ort} · {k.land}</div>
                <div className={styles.cardFooter}>
                  <span>👥 ~{k.members}</span>
                  {isInactive
                    ? <span style={{fontSize:11,color:'var(--muted)'}}>✉️ Einladen</span>
                    : <span style={{color:'var(--g)',fontWeight:500,fontSize:11}}>{k.angebote} Angebote</span>
                  }
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
