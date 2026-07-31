import Nav from'../components/Nav'
import Link from'next/link'
import styles from'../styles/UeberUns.module.css'
export default function UeberUns(){
return(
<div className={styles.page}>
<Nav/>
<div className={styles.hero}>
<div className={styles.heroInner}>
<div className={styles.label}>Über uns</div>
<h1 className={styles.title}>Warum Communet?</h1>
<p className={styles.sub}>Eine Plattform. Kein Produkt.</p>
</div>
</div>
<div className={styles.container}>
<section className={styles.section}>
<h2 className={styles.sectionTitle}>Die Idee</h2>
<p className={styles.text}>
Communet entstand aus einer einfachen Beobachtung: Es gibt weltweit Hunderte von Ökodörfern, Kommunen und alternativen Gemeinschaften — aber kaum einen Ort, der sie alle zusammenbringt. Wer eine Gemeinschaft sucht, findet verstreute Listen, veraltete Websites und keine Möglichkeit, direkt Kontakt aufzunehmen.
</p>
<p className={styles.text}>
Gleichzeitig gibt es Menschen, die genau das suchen — ein anderes Leben, mehr Gemeinschaft, weniger Konsum. Die Verbindung zwischen beiden fehlte.
</p>
</section>

<section className={styles.section}>
<h2 className={styles.sectionTitle}>Unsere Mission</h2>
<p className={styles.text}>
Communet ist eine offene, kostenlose und werbefreie Plattform für alle, die anders leben wollen — oder es bereits tun. Wir verbinden Kommunen, Ökodörfer und Kollektive weltweit mit Menschen, die Gemeinschaft suchen.
</p>
<p className={styles.text}>
Nicht als Produkt. Nicht als Algorithmus. Sondern als ehrliche Karte des alternativen Lebens.
</p>
</section>

<section className={styles.section}>
<h2 className={styles.sectionTitle}>Wer steckt dahinter?</h2>
<p className={styles.text}>
Communet wird von Jan Lucas Abram gegründet und entwickelt — mit Sitz in Bergisch Gladbach bei Köln. Das Projekt ist unabhängig, nicht kommerziell und wird aus Überzeugung gebaut.
</p>
<p className={styles.text}>
Das Team wächst. Wenn du mithelfen möchtest — als Entwickler:in, Designer:in oder einfach als Mensch der die Idee teilt — meld dich gerne.
</p>
</section>

<section className={styles.section}>
<h2 className={styles.sectionTitle}>Grundsätze</h2>
<div className={styles.principles}>
<div className={styles.principle}>
<div className={styles.principleIcon}>🌱</div>
<div className={styles.principleTitle}>Kostenlos</div>
<p className={styles.principleText}>Communet ist und bleibt kostenlos für Menschen und Kommunen. Basisfunktionen werden nie hinter einer Paywall verschwinden.</p>
</div>
<div className={styles.principle}>
<div className={styles.principleIcon}>🚫</div>
<div className={styles.principleTitle}>Keine Werbung</div>
<p className={styles.principleText}>Wir verkaufen keine Aufmerksamkeit. Keine Anzeigen, keine gesponserten Inhalte, kein Tracking.</p>
</div>
<div className={styles.principle}>
<div className={styles.principleIcon}>⚖️</div>
<div className={styles.principleTitle}>Neutral</div>
<p className={styles.principleText}>Kein Algorithmus entscheidet, welche Kommune oben steht. Alle werden gleich behandelt.</p>
</div>
<div className={styles.principle}>
<div className={styles.principleIcon}>🌍</div>
<div className={styles.principleTitle}>Weltweit</div>
<p className={styles.principleText}>Alternative Gemeinschaften gibt es auf jedem Kontinent. Communet bildet alle ab — nicht nur die bekanntesten.</p>
</div>
</div>
</section>

<section className={styles.ctaSection}>
<h2 className={styles.ctaTitle}>Mitmachen</h2>
<p className={styles.ctaText}>Communet lebt von Menschen wie dir — ob als Nutzer:in, als Kommune oder als Unterstützer:in.</p>
<div className={styles.ctaBtns}>
<Link href="/auth/login" className={styles.btnPrimary}>Profil erstellen</Link>
<Link href="/kommunen" className={styles.btnSecondary}>Kommunen entdecken</Link>
<a href="mailto:communet@outlook.de" className={styles.btnSecondary}>Kontakt aufnehmen</a>
</div>
</section>
</div>
<footer style={{padding:'20px 48px',borderTop:'.5px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
<span style={{fontSize:13,color:'var(--muted)'}}>communet · 2026</span>
<div style={{display:'flex',gap:20}}>
<Link href="/datenschutz" style={{fontSize:12,color:'var(--muted)'}}>Datenschutz</Link>
<a href="mailto:communet@outlook.de" style={{fontSize:12,color:'var(--muted)'}}>Kontakt</a>
</div>
</footer>
</div>
)
}
