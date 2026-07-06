import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Nav from '../components/Nav'
import { useLang } from '../lib/LanguageContext'
import { COMMUNITIES, getTypBadge } from '../data/communities'
import styles from '../styles/Karte.module.css'

const MapComponent = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => <div className={styles.mapLoading}>🗺️</div>
})

export default function Karte() {
  const { t } = useLang()
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('alle')
  const filtered = COMMUNITIES.filter(k => filter === 'alle' || k.typ === filter)

  return (
    <div className={styles.page}>
      <Nav />
      <div className={styles.layout}>
        <div className={styles.sidebar}>
          <div className={styles.sideHeader}>
            <h1 className={styles.title}>{t('map_title')}</h1>
            <p className={styles.sub}>{filtered.length} {t('map_communities')}</p>
          </div>
          <div className={styles.pills}>
            {['alle','Ökodorf','Kommune','Kollektiv','Wohnprojekt'].map(typ => (
              <button key={typ} className={`${styles.pill} ${filter===typ?styles.active:''}`} onClick={()=>setFilter(typ)}>
                {typ==='alle'?t('communities_all').split(' ')[0]:typ}
              </button>
            ))}
          </div>
          <div className={styles.list}>
            {filtered.map(k => (
              <div key={k.id} className={`${styles.listItem} ${selected?.id===k.id?styles.listActive:''}`} onClick={()=>setSelected(k)}>
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
        <div className={styles.mapWrap}>
          <MapComponent communities={filtered} selected={selected} onSelect={setSelected} />
          {selected && (
            <div className={styles.popup}>
              <button className={styles.popupClose} onClick={()=>setSelected(null)}>✕</button>
              <div className={styles.popupIcon}>{selected.icon}</div>
              <div className={styles.popupName}>{selected.name}</div>
              <span className={`badge ${getTypBadge(selected.typ)}`}>{selected.typ}</span>
              <div className={styles.popupLoc}>📍 {selected.ort} · {selected.land}</div>
              <div className={styles.popupDesc}>{selected.beschreibung?.slice(0,100)}…</div>
              <div className={styles.popupStatus} style={{color:selected.status==='aktiv'?'var(--g)':'var(--muted)'}}>
                {selected.status==='aktiv'?`🟢 ${t('map_active')}`:`⚫ ${t('map_inactive')}`}
              </div>
              <a href={`/kommunen/${selected.id}`} className={styles.popupBtn}>{t('map_view_profile')}</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
