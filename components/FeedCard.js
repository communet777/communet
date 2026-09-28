import Link from 'next/link'
import styles from '../styles/Profil.module.css'

// Eine Angebots-Karte im Feed (Profil-Vorschau und /feed).
export default function FeedCard({ o }) {
  return (
    <Link href={`/angebote/${o.id}`} style={{textDecoration:'none'}}>
      <div className={styles.feedCard}>
        <div className={styles.feedCardMeta}>🏡 {o.kommune?.name || 'Kommune'}</div>
        <div style={{display:'flex',gap:8,alignItems:'center',margin:'4px 0'}}>
          <span style={{fontSize:11,fontWeight:600,background:'#e8f5ee',color:'var(--g)',padding:'2px 8px',borderRadius:20}}>{o.typ}</span>
          {o.datum && <span style={{fontSize:11,color:'var(--muted)'}}>📅 {new Date(o.datum).toLocaleDateString('de-DE',{day:'2-digit',month:'long'})}{o.uhrzeit?' · '+o.uhrzeit.slice(0,5)+' Uhr':''}</span>}
          {!o.datum && o.von && <span style={{fontSize:11,color:'var(--muted)'}}>{new Date(o.von).toLocaleDateString('de-DE',{day:'2-digit',month:'short'})}{o.bis?' – '+new Date(o.bis).toLocaleDateString('de-DE',{day:'2-digit',month:'short'}):''}</span>}
        </div>
        <div className={styles.feedCardTitle}>{o.titel}</div>
        {o.ort && <div className={styles.feedCardOrt}>📍 {o.ort}</div>}
        {o.beschreibung && <p className={styles.feedCardDesc}>{o.beschreibung.slice(0,120)}{o.beschreibung.length>120?'…':''}</p>}
      </div>
    </Link>
  )
}
