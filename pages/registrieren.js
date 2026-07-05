import { useState } from 'react'
import Nav from '../components/Nav'
import styles from '../styles/ComingSoon.module.css'

export default function Registrieren() {
  const [email, setEmail] = useState('')
  const [typ, setTyp] = useState('person')
  const [sent, setSent] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    // Placeholder - später mit Supabase verbinden
    setSent(true)
  }

  return (
    <div>
      <Nav />
      <div className={styles.page}>
        {sent ? (
          <>
            <div className={styles.icon}>🎉</div>
            <h1 className={styles.title}>Danke!</h1>
            <p className={styles.desc}>
              Wir haben deine E-Mail gespeichert und melden uns sobald die Registrierung live ist. Du bist dabei!
            </p>
          </>
        ) : (
          <>
            <div className={styles.icon}>👋</div>
            <div className={styles.badge}>Coming Soon</div>
            <h1 className={styles.title}>Mitmachen bei Communet</h1>
            <p className={styles.desc}>
              Die Registrierung ist noch in Arbeit. Hinterlasse deine E-Mail und wir benachrichtigen dich sobald es losgeht.
            </p>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.typSelector}>
                <button
                  type="button"
                  className={`${styles.typBtn} ${typ === 'person' ? styles.typActive : ''}`}
                  onClick={() => setTyp('person')}
                >👤 Als Person</button>
                <button
                  type="button"
                  className={`${styles.typBtn} ${typ === 'kommune' ? styles.typActive : ''}`}
                  onClick={() => setTyp('kommune')}
                >🏡 Als Kommune</button>
              </div>
              <input
                type="email"
                required
                className={styles.input}
                placeholder="deine@email.de"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <button type="submit" className={styles.btn} style={{width:'100%',textAlign:'center'}}>
                Benachrichtigen wenn es losgeht
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
