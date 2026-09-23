import styles from '../styles/Karte.module.css'
import { WATER_COLORS, roadLabel } from '../lib/water'

export default function WaterPopup({ w, onClose }) {
  const color = WATER_COLORS[w.typ] || '#2b7bb9'
  const dw = w.drinking_water
  const route = `https://www.google.com/maps/dir/?api=1&destination=${w.lat},${w.lon}`
  const osm = `https://www.openstreetmap.org/${w.osm_id}`
  return (
    <div className={styles.popup}>
      <button className={styles.popupClose} onClick={onClose}>✕</button>
      <div className={styles.popupIcon}>{w.typ === 'Heilquelle' ? '♨️' : '💧'}</div>
      <div className={styles.popupName}>{w.name || w.typ}</div>
      <span className="badge" style={{ background: color + '1f', color, alignSelf: 'flex-start' }}>{w.typ}</span>
      <div className={styles.popupLoc}>
        🛣️ {w.road_distance_m != null
          ? `${w.road_distance_m} m bis zur Straße (${roadLabel(w.road_type)})`
          : 'Keine befahrbare Straße im Umkreis von 250 m'}
      </div>
      {w.track_distance_m != null && (
        <div className={styles.popupLoc}>🚜 {w.track_distance_m} m bis zum Feld- oder Waldweg</div>
      )}
      <div className={styles.popupDesc}>
        {dw === 'yes' ? '✅ Als Trinkwasser gekennzeichnet'
          : dw === 'no' ? '⚠️ Laut OpenStreetMap kein Trinkwasser'
          : '❔ Trinkbarkeit ungeprüft, vor dem Trinken abkochen oder filtern'}
      </div>
      <a href={route} target="_blank" rel="noopener noreferrer" className={styles.popupBtn} style={{ background: color }}>🧭 Route planen</a>
      <a href={osm} target="_blank" rel="noopener noreferrer" style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>Auf OpenStreetMap ansehen</a>
    </div>
  )
}
