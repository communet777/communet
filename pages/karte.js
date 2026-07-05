import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Nav from '../components/Nav'
import { COMMUNITIES, getTypBadge } from '../data/communities'
import styles from '../styles/Karte.module.css'

// Leaflet kann nicht server-side gerendert werden
const MapComponent = dynamic(() => import('../components/Map'), { 
  ssr: false,
  loading: () => <div className={styles.mapLoading}>🗺️ Karte wird geladen…</div>
})

export default function Karte() {
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('alle')

  const filtered = COMMUNITIES.filter(k => filter === 'alle' || k.typ === filter)

  return (
    <div className={styles.page}>
      <Nav />
      <div className={styles.layout}>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.sideHeader}>
            <h1 className={styles.title}>Karte</h1>
            <p className={styles.sub}>{filtered.length} Gemeinschaften</p>
          </div>
          <div className={styles.pills}>
            {['alle','Ökodorf','Kommune','Kollektiv','Wohnprojekt'].map(t => (
              <button key={t} className={`${styles.pill} ${filter===t?styles.active:''}`} onClick={() => setFilter(t)}>
                {t === 'alle' ? 'Alle' : t}
              </button>
            ))}
          </div>
          <div className={styles.list}>
            {filtered.map(k => (
              <div key={k.id} className={`${styles.listItem} ${selected?.id===k.id?styles.listActive:''}`} onClick={() => setSelected(k)}>
                <span className={styles.listIcon}>{k.icon}</span>
                <div className={styles.listBody}>
                  <div className={styles.listName}>{k.name}</div>
                  <div className={styles.listLoc}>{k.ort} · {k.land}</div>
                </div>
                <div className={`${styles.statusDot} ${k.status==='aktiv'?styles.dotGreen:styles.dotGray}`}/>
              </div>
            ))}
          </div>
        </div>

        {/* Karte */}
        <div className={styles.mapWrap}>
          <MapComponent communities={filtered} selected={selected} onSelect={setSelected} />
          {selected && (
            <div className={styles.popup}>
              <button className={styles.popupClose} onClick={() => setSelected(null)}>✕</button>
              <div className={styles.popupIcon}>{selected.icon}</div>
              <div className={styles.popupName}>{selected.name}</div>
              <span className={`badge ${getTypBadge(selected.typ)}`}>{selected.typ}</span>
              <div className={styles.popupLoc}>📍 {selected.ort} · {selected.land}</div>
              <div className={styles.popupDesc}>{selected.beschreibung?.slice(0,100)}…</div>
              <div className={styles.popupStatus} style={{color: selected.status==='aktiv'?'var(--g)':'var(--muted)'}}>
                {selected.status==='aktiv' ? '🟢 Aktiv auf Communet' : '⚫ Noch nicht registriert'}
              </div>
              <a href={`/kommunen/${selected.id}`} className={styles.popupBtn}>Profil ansehen →</a>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
