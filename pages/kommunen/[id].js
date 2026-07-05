import Link from 'next/link'
import { useRouter } from 'next/router'
import Nav from '../../components/Nav'
import { COMMUNITIES, getTypBadge, getStatusInfo } from '../../data/communities'
import styles from '../../styles/KommuneProfil.module.css'

export default function KommuneProfil() {
  const router = useRouter()
  const { id } = router.query
  const k = COMMUNITIES.find(c => c.id === parseInt(id))

  if (!k) return (
    <div>
      <Nav />
      <div style={{padding:48,textAlign:'center',color:'var(--muted)'}}>
        Kommune nicht gefunden. <Link href="/kommunen" style={{color:'var(--g)'}}>Zurück zum Verzeichnis</Link>
      </div>
    </div>
  )

  const status = getStatusInfo(k.status)
  const isActive = k.status === 'aktiv'
  const isSetup = k.status === 'einrichtung'
  const isInactive = k.status === 'nicht-registriert'

  return (
    <div>
      <Nav />

      <div className={styles.banner} style={{opacity: isInactive ? 0.7 : 1}}>
        <div className={styles.bannerPattern} />
        <div className={styles.avatar}>{k.icon}</div>
        <div className={styles.statusBadge} style={{background: status.bg, color: status.color}}>
          {status.icon} {status.label}
        </div>
      </div>

      <div className={styles.profileHeader}>
        <div>
          <h1 className={styles.name}>{k.name}</h1>
          <div className={styles.meta}>
            <span className={`badge ${getTypBadge(k.typ)}`}>{k.typ}</span>
            <span className={styles.loc}>📍 {k.ort}, {k.region} · {k.land}</span>
            <span className={styles.founded}>Seit {k.jahr}</span>
          </div>
        </div>

        {/* Aktions-Buttons je nach Status */}
        <div className={styles.actions}>
          {isActive && (
            <>
              <button className="btn-secondary">✉️ Nachricht</button>
              <button className="btn-primary">Kontakt aufnehmen</button>
            </>
          )}
          {isSetup && (
            <div className={styles.setupNotice}>
              🟡 Profil wird gerade eingerichtet — bald erreichbar
            </div>
          )}
          {isInactive && (
            <button className={styles.inviteBtn} onClick={() => alert('Einladung wird gesendet!')}>
              ✉️ Kommune einladen
            </button>
          )}
        </div>
      </div>

      {/* Inaktiv-Banner */}
      {isInactive && (
        <div className={styles.inactiveBanner}>
          <span>⚫</span>
          <div>
            <strong>Diese Kommune ist noch nicht auf Communet aktiv.</strong>
            <span> Du kannst ihr Profil ansehen, aber noch keinen Kontakt über Communet aufnehmen. Lade sie ein, damit das möglich wird.</span>
          </div>
          <button className={styles.inviteBtn} onClick={() => alert('Einladung wird gesendet!')}>
            Einladen
          </button>
        </div>
      )}

      <div className={styles.statsRow}>
        <div className={styles.statCell}><div className={styles.statN}>{k.members}</div><div className={styles.statL}>Mitglieder</div></div>
        <div className={styles.statCell}><div className={styles.statN}>{k.jahr}</div><div className={styles.statL}>Gegründet</div></div>
        <div className={styles.statCell}>
          <div className={styles.statN}>{isActive ? k.angebote : '—'}</div>
          <div className={styles.statL}>Aktive Angebote</div>
        </div>
        <div className={styles.statCell}>
          <div className={styles.statN}>{isActive ? '4.8 ★' : '—'}</div>
          <div className={styles.statL}>Bewertung</div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.main}>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Über uns</div>
            <p className={styles.desc}>{k.beschreibung}</p>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Werte &amp; Lebensweise</div>
            <div className={styles.tags}>
              {k.tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
            </div>
          </div>

          {isActive && k.angebote > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Aktuelle Angebote</div>
              <div className={styles.offers}>
                <div className={styles.offerCard}>
                  <div className={styles.offerTop}>
                    <span className="badge badge-oeko">Workshop</span>
                  </div>
                  <div className={styles.offerTitle}>Hühnerstall bauen — 3 Tage inkl. Kost &amp; Logis</div>
                  <div className={styles.offerMeta}>📅 15.–17. Aug 2025 · 👥 4 von 6 Plätzen frei</div>
                </div>
                <div className={styles.offerCard}>
                  <div className={styles.offerTop}>
                    <span className="badge badge-kommune">Mithilfe</span>
                  </div>
                  <div className={styles.offerTitle}>Ernte einbringen — flexible Dauer</div>
                  <div className={styles.offerMeta}>📅 Aug–Sept 2025 · Unbegrenzt</div>
                </div>
              </div>
            </div>
          )}

          {isInactive && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Angebote</div>
              <div className={styles.lockedBox}>
                <div className={styles.lockedIcon}>🔒</div>
                <div className={styles.lockedText}>
                  Angebote sind nur für aktive Communet-Mitglieder sichtbar.
                  <br />
                  <button className={styles.inviteBtn} style={{marginTop:10}} onClick={() => alert('Einladung wird gesendet!')}>
                    Diese Kommune einladen
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        <div className={styles.sidebar}>

          {/* Kontakt-Box je nach Status */}
          <div className={styles.sideCard}>
            {isActive && (
              <>
                <div className={styles.sideTitle}>✉️ Kontakt aufnehmen</div>
                <p style={{fontSize:12,color:'var(--muted)',marginBottom:12,lineHeight:1.6}}>
                  Diese Kommune ist aktiv auf Communet. Du kannst direkt eine Nachricht schicken.
                </p>
                <button className="btn-primary" style={{width:'100%'}}>Nachricht schreiben</button>
              </>
            )}
            {isSetup && (
              <>
                <div className={styles.sideTitle}>🟡 In Einrichtung</div>
                <p style={{fontSize:12,color:'var(--muted)',lineHeight:1.6}}>
                  Diese Kommune richtet gerade ihr Profil ein. Kontakt ist bald möglich.
                </p>
              </>
            )}
            {isInactive && (
              <>
                <div className={styles.sideTitle}>⚫ Noch nicht aktiv</div>
                <p style={{fontSize:12,color:'var(--muted)',marginBottom:12,lineHeight:1.6}}>
                  Diese Kommune ist noch nicht auf Communet registriert. Über Communet ist kein Kontakt möglich.
                </p>
                <button className={styles.inviteBtn} style={{width:'100%'}} onClick={() => alert('Einladung wird gesendet!')}>
                  ✉️ Einladung schicken
                </button>
                {k.website && (
                  <a href={k.website} target="_blank" rel="noopener noreferrer"
                    style={{display:'block',textAlign:'center',marginTop:10,fontSize:12,color:'var(--g)'}}>
                    🔗 Direkt zur Website
                  </a>
                )}
              </>
            )}
          </div>

          <div className={styles.sideCard}>
            <div className={styles.sideTitle}>📍 Standort</div>
            <div className={styles.mapPlaceholder}>🗺️ Auf Karte zeigen</div>
            <div style={{marginTop:8,fontSize:12,color:'var(--muted)'}}>
              {k.ort}, {k.region}<br />{k.land}
            </div>
          </div>

          {k.website && (
            <div style={{textAlign:'center',padding:'8px 0'}}>
              <a href={k.website} target="_blank" rel="noopener noreferrer"
                style={{fontSize:12,color:'var(--g)'}}>
                🔗 {k.website.replace('https://','')}
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
