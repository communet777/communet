import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import styles from '../../styles/Auth.module.css'

export default function NeuesPasswort() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwörter stimmen nicht überein.'); return }
    if (password.length < 8) { setError('Mindestens 8 Zeichen.'); return }
    setStatus('loading')
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setStatus('idle') }
    else setStatus('done')
  }

  if (status === 'done') return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link href="/" className={styles.logo}>communet</Link>
        <div className={styles.success}>
          <div className={styles.successIcon}>✅</div>
          <h2>Passwort geändert!</h2>
          <p>Du kannst dich jetzt mit deinem neuen Passwort anmelden.</p>
          <Link href="/auth/login" className={styles.btn} style={{textDecoration:'none',display:'block',textAlign:'center',marginTop:12}}>Zur Anmeldung</Link>
        </div>
      </div>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link href="/" className={styles.logo}>communet</Link>
        <h2 style={{fontSize:18,fontWeight:700,margin:'0 0 8px',textAlign:'center'}}>Neues Passwort</h2>
        <p style={{fontSize:13,color:'var(--muted)',textAlign:'center',margin:'0 0 24px'}}>
          Wähl ein neues Passwort für deinen Account.
        </p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label>Neues Passwort</label>
            <input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="mind. 8 Zeichen"/>
          </div>
          <div className={styles.field}>
            <label>Passwort wiederholen</label>
            <input type="password" required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="mind. 8 Zeichen"/>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.btn} disabled={status==='loading'}>
            {status==='loading' ? 'Speichert...' : 'Passwort speichern'}
          </button>
        </form>
      </div>
    </div>
  )
}
