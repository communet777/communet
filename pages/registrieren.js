import { useState } from 'react'
import Nav from '../components/Nav'
import styles from '../styles/Registrieren.module.css'

const LAENDER = [
  "Deutschland","Österreich","Schweiz","Frankreich","Italien","Spanien","Portugal",
  "Niederlande","Belgien","Dänemark","Schweden","Norwegen","Finnland","Polen",
  "Tschechien","Slowakei","Ungarn","Kroatien","Griechenland","Irland","England",
  "Schottland","Wales","Estland","Lettland","Litauen","Slowenien","Rumänien",
  "Bulgarien","Serbien","Anderes"
]

export default function Registrieren() {
  const [form, setForm] = useState({ name: '', email: '', land: '', typ: 'person', honeypot: '' })
  const [status, setStatus] = useState('idle')

  function update(field, val) { setForm(f => ({...f, [field]: val})) }

  async function handleSubmit(e) {
    e.preventDefault()
    // Honeypot — wenn ausgefüllt ist es ein Bot
    if (form.honeypot) return
    if (!form.name || !form.email || !form.land) return
    setStatus('sending')
    try {
      const res = await fetch('https://formspree.io/f/xzdloqrg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          land: form.land,
          typ: form.typ,
          _subject: `Neue Communet-Anmeldung: ${form.typ} aus ${form.land}`,
        }),
      })
      if (res.ok) setStatus('sent')
      else setStatus('error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div>
      <Nav />
      <div className={styles.page}>
        {status === 'sent' ? (
          <>
            <div className={styles.icon}>🎉</div>
            <h1 className={styles.title}>Danke, {form.name}!</h1>
            <p className={styles.desc}>
              Wir melden uns an <strong>{form.email}</strong> sobald die Registrierung live ist. Du bist dabei!
            </p>
          </>
        ) : (
          <>
            <div className={styles.icon}>👋</div>
            <div className={styles.badge}>Coming Soon</div>
            <h1 className={styles.title}>Mitmachen bei Communet</h1>
            <p className={styles.desc}>
              Hinterlasse deine Daten und wir benachrichtigen dich sobald es losgeht.
            </p>

            <form onSubmit={handleSubmit} className={styles.form}>

              {/* Typ-Auswahl */}
              <div className={styles.typSelector}>
                <button type="button"
                  className={`${styles.typBtn} ${form.typ==='person' ? styles.typActive : ''}`}
                  onClick={() => update('typ','person')}>
                  👤 Als Person
                </button>
                <button type="button"
                  className={`${styles.typBtn} ${form.typ==='kommune' ? styles.typActive : ''}`}
                  onClick={() => update('typ','kommune')}>
                  🏡 Als Kommune
                </button>
              </div>

              {/* Name */}
              <div className={styles.fieldWrap}>
                <label className={styles.label}>
                  {form.typ === 'kommune' ? 'Name der Kommune' : 'Dein Name'} *
                </label>
                <input
                  type="text"
                  required
                  className={styles.input}
                  placeholder={form.typ === 'kommune' ? 'z.B. Ökodorf Sieben Linden' : 'Vor- und Nachname'}
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                />
              </div>

              {/* E-Mail */}
              <div className={styles.fieldWrap}>
                <label className={styles.label}>E-Mail *</label>
                <input
                  type="email"
                  required
                  className={styles.input}
                  placeholder="deine@email.de"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                />
              </div>

              {/* Land */}
              <div className={styles.fieldWrap}>
                <label className={styles.label}>Land *</label>
                <select
                  required
                  className={styles.input}
                  value={form.land}
                  onChange={e => update('land', e.target.value)}
                >
                  <option value="">Land auswählen…</option>
                  {LAENDER.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {/* Honeypot — unsichtbar für Menschen, Falle für Bots */}
              <input
                type="text"
                name="_gotcha"
                style={{display:'none'}}
                tabIndex="-1"
                autoComplete="off"
                value={form.honeypot}
                onChange={e => update('honeypot', e.target.value)}
              />

              <button
                type="submit"
                className={styles.btn}
                disabled={status === 'sending'}
              >
                {status === 'sending' ? 'Wird gesendet…' : 'Benachrichtigen wenn es losgeht →'}
              </button>

              {status === 'error' && (
                <p className={styles.error}>
                  Etwas ist schiefgelaufen — schreib uns direkt an communet@outlook.de
                </p>
              )}

            </form>
          </>
        )}
      </div>
    </div>
  )
}
