import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import styles from '../../styles/Auth.module.css'

const INVITE_CODES = ['COMMUNET2025', 'BETA-EARTH', 'OEKODORF-1', 'COMMUNE-2', 'TAMERA-3', 'FINDHORN-4', 'SIEBEN-5', 'ZEGG-6', 'FESTIVAL-7', 'PORTUGAL-8']

export default function Login() {
  const router = useRouter()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [typ, setTyp] = useState('person')
  const [inviteCode, setInviteCode] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setStatus('loading')
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('E-Mail oder Passwort falsch.'); setStatus('idle') }
    else router.push('/profil')
  }

  async function handleRegister(e) {
    e.preventDefault()
    setStatus('loading')
    setError('')
    if (!INVITE_CODES.includes(inviteCode.toUpperCase())) {
      setError('Ungültiger Invite-Code. Bitte bei communet@outlook.de anfragen.')
      setStatus('idle')
      return
    }
    const profileStatus = typ === 'kommune' ? 'pending' : 'approved'
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, typ } }
    })
    if (error) { setError(error.message); setStatus('idle'); return }
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id, name, typ, email, status: profileStatus
      })
    }
    setStatus('registered')
  }

  async function handleMagicLink(e) {
    e.preventDefault()
    setStatus('loading')
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'https://communet.net/profil' }
    })
    if (error) { setError(error.message); setStatus('idle') }
    else setStatus('magic_sent')
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link href="/" className={styles.logo}>communet</Link>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${mode==='login'?styles.tabActive:''}`} onClick={()=>setMode('login')}>Anmelden</button>
          <button className={`${styles.tab} ${mode==='register'?styles.tabActive:''}`} onClick={()=>setMode('register')}>Registrieren</button>
          <button className={`${styles.tab} ${mode==='magic'?styles.tabActive:''}`} onClick={()=>setMode('magic')}>Magic Link</button>
        </div>

        {mode === 'login' && (
          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.field}>
              <label>E-Mail</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="deine@email.de"/>
            </div>
            <div className={styles.field}>
              <label>Passwort</label>
              <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="mind. 8 Zeichen"/>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.btn} disabled={status==='loading'}>
              {status==='loading' ? 'Lädt...' : 'Anmelden'}
            </button>
            <Link href="/auth/passwort-vergessen" style={{textAlign:'center',fontSize:12,color:'var(--muted)',display:'block',marginTop:8}}>
              Passwort vergessen?
            </Link>
          </form>
        )}

        {mode === 'register' && status !== 'registered' && (
          <form onSubmit={handleRegister} className={styles.form}>
            <div className={styles.typSelector}>
              <button type="button" className={`${styles.typBtn} ${typ==='person'?styles.typActive:''}`} onClick={()=>setTyp('person')}>👤 Person</button>
              <button type="button" className={`${styles.typBtn} ${typ==='kommune'?styles.typActive:''}`} onClick={()=>setTyp('kommune')}>🏡 Kommune</button>
            </div>
            <div className={styles.field}>
              <label>{typ==='kommune' ? 'Name der Kommune' : 'Dein Name'}</label>
              <input type="text" required value={name} onChange={e=>setName(e.target.value)} placeholder={typ==='kommune' ? 'z.B. Ökodorf Sieben Linden' : 'Vor- und Nachname'}/>
            </div>
            <div className={styles.field}>
              <label>E-Mail</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="deine@email.de"/>
            </div>
            <div className={styles.field}>
              <label>Passwort</label>
              <input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="mind. 8 Zeichen"/>
            </div>
            <div className={styles.field}>
              <label>Invite-Code</label>
              <input type="text" required value={inviteCode} onChange={e=>setInviteCode(e.target.value)} placeholder="Dein Einladungscode"/>
              <span className={styles.hint}>Noch keinen? Schreib an communet@outlook.de</span>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.btn} disabled={status==='loading'}>
              {status==='loading' ? 'Lädt...' : 'Konto erstellen'}
            </button>
          </form>
        )}

        {mode === 'register' && status === 'registered' && (
          <div className={styles.success}>
            <div className={styles.successIcon}>🎉</div>
            <h2>Willkommen bei Communet!</h2>
            {typ === 'kommune'
              ? <p>Deine Kommune wurde angelegt und wird bald freigeschaltet. Du kannst dich jetzt anmelden und dein Profil bearbeiten.</p>
              : <p>Bitte bestätige deine E-Mail-Adresse — danach kannst du dich anmelden.</p>
            }
          </div>
        )}

        {mode === 'magic' && status !== 'magic_sent' && (
          <form onSubmit={handleMagicLink} className={styles.form}>
            <p className={styles.magicInfo}>Kein Passwort nötig — wir schicken dir einen Login-Link per E-Mail.</p>
            <div className={styles.field}>
              <label>E-Mail</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="deine@email.de"/>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.btn} disabled={status==='loading'}>
              {status==='loading' ? 'Lädt...' : 'Link senden'}
            </button>
          </form>
        )}

        {mode === 'magic' && status === 'magic_sent' && (
          <div className={styles.success}>
            <div className={styles.successIcon}>✉️</div>
            <h2>Check deine E-Mails!</h2>
            <p>Wir haben dir einen Login-Link geschickt.</p>
          </div>
        )}
      </div>
    </div>
  )
}
