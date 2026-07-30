import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Nav from '../../components/Nav'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import styles from '../../styles/Admin.module.css'

const ADMIN_EMAIL = 'janabram@posteo.de'

export default function Admin() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [pending, setPending] = useState([])
  const [approved, setApproved] = useState([])
  const [working, setWorking] = useState(null)

  useEffect(() => {
    if (!loading && (!user || user.email !== ADMIN_EMAIL)) router.replace('/')
  }, [user, loading])

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return
    loadData()
  }, [user])

  async function loadData() {
    const { data } = await supabase.from('profiles').select('*').eq('typ', 'kommune').order('created_at', { ascending: false })
    if (data) {
      setPending(data.filter(p => p.status === 'pending'))
      setApproved(data.filter(p => p.status === 'approved'))
    }
  }

  async function approve(id) {
    setWorking(id)
    await supabase.from('profiles').update({ status: 'approved' }).eq('id', id)
    await loadData()
    setWorking(null)
  }

  async function reject(id) {
    setWorking(id)
    await supabase.from('profiles').update({ status: 'rejected' }).eq('id', id)
    await loadData()
    setWorking(null)
  }

  if (loading || !user) return <div className={styles.loading}><div className={styles.spinner}/></div>
  if (user.email !== ADMIN_EMAIL) return null

  return (
    <div className={styles.page}>
      <Nav/>
      <div className={styles.container}>
        <h1 className={styles.title}>Admin — Kommunen</h1>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>⏳ Warten auf Freischaltung ({pending.length})</h2>
          {pending.length === 0 && <p className={styles.empty}>Keine offenen Anfragen.</p>}
          {pending.map(p => (
            <div key={p.id} className={styles.card}>
              <div className={styles.cardInfo}>
                <div className={styles.cardName}>{p.name || '(kein Name)'}</div>
                <div className={styles.cardMeta}>{p.email} · {p.kommune_typ || 'Kommune'} · {p.land || 'kein Ort'}</div>
                {p.bio && <div className={styles.cardBio}>{p.bio}</div>}
              </div>
              <div className={styles.cardActions}>
                <button className={styles.btnApprove} onClick={() => approve(p.id)} disabled={working === p.id}>
                  {working === p.id ? '...' : '✅ Freischalten'}
                </button>
                <button className={styles.btnReject} onClick={() => reject(p.id)} disabled={working === p.id}>
                  {working === p.id ? '...' : '❌ Ablehnen'}
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>✅ Freigeschaltet ({approved.length})</h2>
          {approved.map(p => (
            <div key={p.id} className={`${styles.card} ${styles.cardApproved}`}>
              <div className={styles.cardInfo}>
                <div className={styles.cardName}>{p.name}</div>
                <div className={styles.cardMeta}>{p.email} · {p.kommune_typ || 'Kommune'} · {p.land || 'kein Ort'}</div>
              </div>
              <button className={styles.btnReject} onClick={() => reject(p.id)} disabled={working === p.id}>
                Sperren
              </button>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
