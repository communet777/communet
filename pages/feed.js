import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../components/Nav'
import FeedCard from '../components/FeedCard'
import { useAuth } from '../lib/AuthContext'
import { loadFeedOffers } from '../lib/feed'
import styles from '../styles/Profil.module.css'

export default function Feed() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [offers, setOffers] = useState([])
  const [feedLoading, setFeedLoading] = useState(true)

  useEffect(() => { if (!loading && !user) router.replace('/auth/login') }, [user, loading])

  useEffect(() => {
    if (!user) return
    loadFeedOffers(user.id)
      .then(o => { setOffers(o); setFeedLoading(false) })
      .catch(() => setFeedLoading(false))
  }, [user])

  if (loading || !user) return <div className={styles.loading}><div className={styles.spinner}/></div>

  return (
    <div className={styles.page}>
      <Nav/>
      <div style={{maxWidth:760,margin:'0 auto',padding:'24px 16px'}}>
        <main className={styles.feed}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:12,flexWrap:'wrap'}}>
            <h1 className={styles.feedTitle}>Dein Feed</h1>
            <Link href="/favoriten" style={{fontSize:12,color:'var(--g)'}}>♥ Meine Favoriten</Link>
          </div>
          {feedLoading && <div style={{color:'var(--muted)',fontSize:13,padding:24,textAlign:'center'}}>Lädt...</div>}
          {!feedLoading && offers.length === 0 && (
            <div className={styles.feedPlaceholder}>
              <div className={styles.feedIcon}>🌏</div>
              <p className={styles.feedSub}>
                Hier erscheinen Angebote von Kommunen, denen du folgst.<br/>
                Klick auf ♡ auf einer Kommunen-Seite, um ihr zu folgen.
              </p>
              <Link href="/kommunen" className={styles.btnPrimary} style={{display:'inline-block',marginTop:16}}>Kommunen entdecken</Link>
            </div>
          )}
          {offers.map(o => <FeedCard key={o.id} o={o}/>)}
        </main>
      </div>
    </div>
  )
}
