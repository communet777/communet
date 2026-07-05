import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Nav from '../components/Nav'
import { COMMUNITIES, getTypBadge, getStatusInfo } from '../data/communities'
import styles from '../styles/Home.module.css'

const Globe = dynamic(() => import('../components/Globe'), { ssr: false })

export default function Home() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const aktive = COMMUNITIES.filter(k => k.status === 'aktiv').slice(0, 4)

  return (
    <div className={styles.page}>
      <Nav />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroLeft}>
          {mounted && <Globe size={360} />}
        </div>
        <div className={styles.heroRight}>
          <div className={styles.eyebrow}>Gemeinschaft neu gedacht</div>
          <h1 className={styles.title}>Verbunden<br />leben<br />gestalten</h1>
          <p className={styles.sub}>
            Kommunen, Ökodörfer und Menschen — verbunden über ganz Europa.
            Finde Gemeinschaften, entdecke Angebote, knüpfe echte Kontakte.
          </p>
          <div className={styles.actions}>
            <Link href="/registrieren" className={styles.btnPrimary}>Profil erstellen</Link>
            <Link href="/kommunen" className={styles.btnSecondary}>Kommunen entdecken</Link>
          </div>
          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <div className={styles.statN}>88</div>
              <div className={styles.statL}>Gemeinschaften</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statN}>23</div>
              <div className={styles.statL}>Länder</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statN}>340+</div>
              <div className={styles.statL}>Aktive Angebote</div>
            </div>
          </div>
        </div>
      </section>

      {/* Aktive Kommunen */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionLabel}>Aktiv auf Communet</div>
            <h2 className={styles.sectionTitle}>Gemeinschaften entdecken</h2>
          </div>
          <Link href="/kommunen" className={styles.sectionLink}>Alle anzeigen →</Link>
        </div>
        <div className={styles.grid}>
          {aktive.map(k => {
            const status = getStatusInfo(k.status)
            return (
              <Link href={`/kommunen/${k.id}`} key={k.id} className={styles.card}>
                <div className={styles.cardImg}>{k.icon}</div>
                <div className={styles.cardBody}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <span className={`badge ${getTypBadge(k.typ)}`}>{k.typ}</span>
                    <span style={{fontSize:10,color:status.color,background:status.bg,padding:'2px 6px',borderRadius:10}}>{status.icon} {status.label}</span>
                  </div>
                  <div className={styles.cardName}>{k.name}</div>
                  <div className={styles.cardLoc}>📍 {k.ort} · {k.land}</div>
                  <div className={styles.cardFooter}>
                    <span className={styles.cardMembers}>~{k.members} Mitglieder</span>
                    <span className={styles.cardOffers}>{k.angebote} Angebote</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Wie funktioniert es */}
      <section className={styles.howSection}>
        <div className={styles.sectionLabel} style={{textAlign:'center',marginBottom:8}}>So funktioniert es</div>
        <h2 className={styles.sectionTitle} style={{textAlign:'center',marginBottom:32}}>Einfach und direkt</h2>
        <div className={styles.howGrid}>
          <div className={styles.howCard}>
            <div className={styles.howIcon}>👤</div>
            <div className={styles.howTitle}>Profil anlegen</div>
            <div className={styles.howText}>Als Person oder Kommune — kostenlos, ohne Werbung, ohne Algorithmen.</div>
          </div>
          <div className={styles.howCard}>
            <div className={styles.howIcon}>🗺️</div>
            <div className={styles.howTitle}>Entdecken</div>
            <div className={styles.howText}>Durchsuche Kommunen auf der Karte, filtere nach Typ und Land, finde was zu dir passt.</div>
          </div>
          <div className={styles.howCard}>
            <div className={styles.howIcon}>✉️</div>
            <div className={styles.howTitle}>Kontakt aufnehmen</div>
            <div className={styles.howText}>Schreib direkt an aktive Kommunen — bei Interesse auf ein Angebot oder einfach zum Kennenlernen.</div>
          </div>
        </div>
      </section>

      {/* Status Erklärung */}
      <section className={styles.statusSection}>
        <div className={styles.sectionLabel} style={{marginBottom:8}}>Transparenz</div>
        <h2 className={styles.sectionTitle} style={{marginBottom:16}}>Was bedeuten die Status-Badges?</h2>
        <div className={styles.statusGrid}>
          <div className={styles.statusCard}>
            <span className={styles.statusDot} style={{background:'#2d6a4f'}}>🟢</span>
            <div>
              <div className={styles.statusTitle}>Aktiv auf Communet</div>
              <div className={styles.statusDesc}>Die Kommune hat sich registriert, ihr Profil ausgefüllt und ist erreichbar. Du kannst direkt Kontakt aufnehmen.</div>
            </div>
          </div>
          <div className={styles.statusCard}>
            <span className={styles.statusDot}>🟡</span>
            <div>
              <div className={styles.statusTitle}>Profil in Einrichtung</div>
              <div className={styles.statusDesc}>Die Kommune hat sich registriert aber das Profil noch nicht fertiggestellt. Kontakt noch nicht möglich.</div>
            </div>
          </div>
          <div className={styles.statusCard}>
            <span className={styles.statusDot}>⚫</span>
            <div>
              <div className={styles.statusTitle}>Noch nicht registriert</div>
              <div className={styles.statusDesc}>Diese Kommune ist aus unserem Katalog importiert aber noch nicht auf Communet aktiv. Du kannst sie einladen.</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>Deine Kommune noch nicht dabei?</h2>
        <p className={styles.ctaSub}>Trag sie ein — kostenlos, in 5 Minuten, ohne technisches Wissen.</p>
        <div className={styles.ctaBtns}>
          <Link href="/registrieren?typ=kommune" className={styles.ctaBtnP}>Kommune eintragen</Link>
          <Link href="/registrieren" className={styles.ctaBtnS}>Als Person registrieren</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <span className={styles.footerLogo}>communet · 2025 · Open source</span>
        <div className={styles.footerLinks}>
          <Link href="/ueber-uns">Über uns</Link>
          <Link href="/kontakt">Kontakt</Link>
          <Link href="/datenschutz">Datenschutz</Link>
        </div>
      </footer>
    </div>
  )
}
