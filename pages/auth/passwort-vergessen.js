import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import styles from '../../styles/Auth.module.css'

export default function PasswortVergessen() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('loading')
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://communet.net/auth/neues-passwort'
    })
    if (error) { setError(error.message); setStatus('idle') }
    else setStatus('sent')
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link href="/" className={styles.logo}>communet</Link>
        <h2 style={{fontSize:18,fontWeight:700,margin:'0 0 8px',textAlign:'center'}}>Passwort zurücksetzen</h2>
        <p style={{fontSize:13,color:'var(--muted)',textAlign:'center',margin:'0 0 24px',lineHeight:1.6}}>
          Gib deine E-Mail ein — wir schicken dir einen Link zum Zurücksetzen.
        </p>
        {status !== 'sent' ? (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label>E-Mail</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="deine@email.de"/>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.btn} disabled={status==='loading'}>
              {status==='loading' ? 'Lädt...' : 'Link senden'}
            </button>
            <Link href="/auth/login" style={{textAlign:'center',fontSize:13,color:'var(--muted)',display:'block',marginTop:8}}>
              Zurück zur Anmeldung
            </Link>
          </form>
        ) : (
          <div className={styles.success}>
            <div className={styles.successIcon}>✉️</div>
            <h2>E-Mail gesendet!</h2>
            <p>Schau in dein Postfach und klick auf den Link um dein Passwort zurückzusetzen.</p>
            <Link href="/auth/login" style={{fontSize:13,color:'var(--g)'}}>← Zur Anmeldung</Link>
          </div>
        )}
      </div>
    </div>
  )
}
