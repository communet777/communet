import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import styles from '../../styles/Auth.module.css'

export default function Login() {
  const router = useRouter()
  const [gate, setGate] = useState(false)          // false = Warteliste, true = interner Bereich
  const [mode, setMode] = useState('register')      // nur relevant wenn gate === true
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [typ, setTyp] = useState('person')
  const [inviteCode, setInviteCode] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  async function handleWaitlist(e) {
    e.preventDefault()
    setStatus('loading')
    setError('')
    const { error } = await supabase.from('waitlist').insert({
      email: email.trim(),
      name: name.trim() || null,
      quelle: 'website'
    })
    if (error && error.code !== '23505') {
      setError('Das hat gerade nicht geklappt. Versuch es bitte nochmal.')
      setStatus('idle')
      return
    }
    setStatus('waitlisted')
  }

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

    const code = inviteCode.trim()
    const { data: valid, error: rpcError } = await supabase
      .rpc('check_invite_code', { p_code: code })

    if (rpcError || !valid) {
      setError('Dieser Code ist nicht gültig oder wurde schon benutzt.')
      setStatus('idle')
      return
    }

    const profileStatus = typ === 'kommune' ? 'pending' : 'approved'
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, typ } }
    })
    if (error) { setError(error.message); setStatus('idle'); return }
    if (!data.user || data.user.identities?.length === 0) {
      setError('Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an oder nutze "Passwort vergessen".')
      setStatus('idle')
      return
    }
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id, name, typ, email, status: profileStatus
      })
      await supabase.rpc('redeem_invite_code', { p_code: code, p_user: data.user.id })
    }
    setStatus('registered')
  }

  async function handleMagicLink(e) {
    e.preventDefault()
    setStatus('loading')
    setError('')
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()
    if (!existing) {
      setError('Kein Account mit dieser E-Mail gefunden.')
      setStatus('idle')
      return
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'https://communet.net/profil' }
    })
    if (error) { setError(error.message); setStatus('idle') }
    else setStatus('magic_sent')
  }

  function switchMode(next) {
    setMode(next)
    setStatus('idle')
    setError('')
  }

  const linkStyle = {
    background:'none', border:'none', padding:0, cursor:'pointer',
    fontSize:12, color:'var(--muted)', textDecoration:'underline'
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link href="/" className={styles.logo}>communet</Link>

        {/* ================= WARTELISTE ================= */}
        {!gate && status !== 'waitlisted' && (
          <form onSubmit={handleWaitlist} className={styles.form}>
            <p className={styles.magicInfo}>
              Communet ist noch nicht offen. Wenn du Interesse hast, schreib dich auf
              die Warteliste — wir melden uns, sobald es losgeht.
            </p>
            <div className={styles.field}>
              <label>E-Mail</label>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="deine@email.de"/>
            </div>
            <div className={styles.field}>
              <label>Name <span style={{fontWeight:400,color:'var(--muted)'}}>(optional)</span></label>
              <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Wie sollen wir dich ansprechen?"/>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.btn} disabled={status==='loading'}>
              {status==='loading' ? 'Lädt...' : 'Auf die Warteliste'}
            </button>
            <div style={{textAlign:'center',marginTop:14,paddingTop:12,borderTop:'1px solid var(--border, #e5e5e5)'}}>
              <button type="button" style={linkStyle}
                onClick={()=>{ setGate(true); setMode('register'); setError(''); setStatus('idle') }}>
                Ich hab einen Early-Access-Code
              </button>
            </div>
          </form>
        )}

        {!gate && status === 'waitlisted' && (
          <div className={styles.success}>
            <div className={styles.successIcon}>🌱</div>
            <h2>Du stehst auf der Liste</h2>
            <p>Danke für dein Interesse. Wir melden uns, sobald Communet öffnet.</p>
          </div>
        )}

        {/* ================= INTERNER BEREICH ================= */}
        {gate && (
          <>
            <div className={styles.tabs}>
              <button className={`${styles.tab} ${mode==='register'?styles.tabActive:''}`} onClick={()=>switchMode('register')}>Registrieren</button>
              <button className={`${styles.tab} ${mode==='login'?styles.tabActive:''}`} onClick={()=>switchMode('login')}>Anmelden</button>
              <button className={`${styles.tab} ${mode==='magic'?styles.tabActive:''}`} onClick={()=>switchMode('magic')}>Magic Link</button>
            </div>

            {mode === 'register' && status !== 'registered' && (
              <form onSubmit={handleRegister} className={styles.form}>
                <div className={styles.field}>
                  <label>Early-Access-Code</label>
                  <input type="text" required value={inviteCode} onChange={e=>setInviteCode(e.target.value)} placeholder="Dein Code" autoFocus/>
                </div>
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

            <div style={{textAlign:'center',marginTop:14}}>
              <button type="button" style={linkStyle}
                onClick={()=>{ setGate(false); setError(''); setStatus('idle') }}>
                Zurück zur Warteliste
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
