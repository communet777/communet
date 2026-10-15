import { useState } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import s from '../styles/Baumhaus.module.css'

/*
  Geheime Bewerbungsseite fürs Baumhaus (Mitbewohnersuche).
  - Nirgends auf communet.net verlinkt, nur per Link weitergegeben.
  - Suchmaschinen ausgeschlossen (noindex).
  - Antworten landen in Supabase-Tabelle baumhaus_bewerbungen (nur Einfügen erlaubt,
    lesen nur im Supabase-Dashboard).
  Grundlage: Google-Formular "Werde Teil der Baumhaus Gemeinschaft", erweitert (Stufe 1).
*/

const HEADER_IMG = 'https://lh4.googleusercontent.com/ltS6cp-2K2aZyFBqqTtgaudQ5dSHq5hzEWWjhoZIb90fckHH3rz0Lj4fVlTr-szeh8dQsgovoc2H0qI=w1200-h630-p'
const FOOTER_IMG = 'https://docs.google.com/forms-images-rt/ANbbkijZ-s-QDekMdSoYIhhRtvlJ-syvp8OMIvrHHX75zkjfK-JneJeLMQeQiqd6jy43EX3iocn0bB2zVIaK-GHBacQ_Ueuhtbwtkb1rGqFVpZ7kJqV4oREUVLoZUqipPqvNfzWHZcYecFBVtdtvkzFtGo662zu0r_ktFST3RZyCEtoCZziv22myxJ5LcR3StDilDWkeVh8oqtk=w960'

const EINZEL = 'single'
const MEHRFACH = 'multi'

const FRAGEN = {
  quelle: { typ: EINZEL, label: 'Wie hast du vom Baumhaus erfahren?', opts: ['Über Freunde oder Bekannte', 'Instagram', 'Telegram oder WhatsApp', 'Aushang', 'Ich war schon mal da', 'Anders'] },
  suche: { typ: EINZEL, label: 'Ich bin auf der Suche nach …', pflicht: true, opts: ['Einem langfristigen Zuhause', 'Einer Untermiete für begrenzte Zeit', 'Ich stelle mir ein anderes Modell vor', 'Ich weiß es noch nicht'] },
  dauer: { typ: EINZEL, label: 'Wie lange möchtest du ungefähr bleiben?', opts: ['Unter 6 Monate', '6 bis 12 Monate', '1 bis 3 Jahre', 'Länger', 'Noch offen'] },
  mitkommen: { typ: MEHRFACH, label: 'Du kommst …', hint: 'Mehrfachauswahl möglich', opts: ['Allein', 'Mit Partner oder Partnerin', 'Mit Kind oder Kindern', 'Mit Tier'] },
  besuch: { typ: EINZEL, label: 'Warst du schon mal bei uns zu Besuch?', opts: ['Ja', 'Nein'] },

  reiz: { typ: MEHRFACH, label: 'Was reizt dich am Zusammenleben?', hint: 'Mehrfachauswahl möglich', opts: ['Austausch und Gesellschaft', 'Gemeinsam kochen und essen', 'Garten und Natur', 'Teilen statt besitzen', 'Gemeinsame Projekte', 'Nicht allein wohnen', 'Günstiger wohnen'] },
  bedenken: { typ: MEHRFACH, label: 'Und was sind deine Bedenken dabei?', hint: 'Mehrfachauswahl möglich', opts: ['Zu wenig Rückzug', 'Lärm', 'Konflikte', 'Ungleiche Arbeitsteilung', 'Zu viele Treffen', 'Ordnung und Sauberkeit', 'Eigentlich keine'] },
  erfahrung: { typ: EINZEL, label: 'Hast du schon in einer WG oder Gemeinschaft gelebt?', opts: ['Nein, wäre das erste Mal', 'Ja, unter einem Jahr', 'Ja, 1 bis 3 Jahre', 'Ja, länger als 3 Jahre', 'Ja, in einem Wohnprojekt oder einer Gemeinschaft'] },
  nervt: { typ: MEHRFACH, label: 'Was nervt dich im Zusammenleben am meisten?', hint: 'Mehrfachauswahl möglich', opts: ['Stehengelassenes Geschirr', 'Lärm in der Nacht', 'Unzuverlässigkeit', 'Wenn nicht geredet wird', 'Ständig Besuch', 'Unordnung in Gemeinschaftsräumen', 'Zettel statt Gespräch'] },
  ichnerve: { typ: MEHRFACH, label: 'Und was könnte an dir nerven? 😅', hint: 'Mehrfachauswahl möglich, ehrlich ist sympathisch', opts: ['Ich bin manchmal chaotisch', 'Ich bin eher laut', 'Ich brauche viel Ruhe', 'Ich bin viel unterwegs', 'Ich rede gern und viel', 'Ich nehme es sehr genau', 'Ich vergesse Dinge'] },

  essen: { typ: EINZEL, label: 'Wie oft möchtest du mit den anderen kochen und essen?', opts: ['Fast nie', 'Etwa einmal pro Woche', 'Mehrmals pro Woche', 'Am liebsten täglich'] },
  ernaehrung: { typ: MEHRFACH, label: 'Ernährung', hint: 'Freiwillig, Mehrfachauswahl möglich', opts: ['Esse alles', 'Vegetarisch', 'Vegan', 'Allergie oder Unverträglichkeit (sag es uns gern beim Kennenlernen)'] },

  stunden: { typ: EINZEL, label: 'Wie viele Stunden pro Woche kannst du für Haus, Garten und Organisation aufbringen?', opts: ['Unter 2', '2 bis 4', '4 bis 8', 'Mehr als 8'] },
  treffen: { typ: EINZEL, label: 'Regelmäßige Haustreffen, zum Beispiel alle zwei Wochen: passt das für dich?', opts: ['Ja', 'Eher ja', 'Eher nein'] },
  entscheiden: { typ: EINZEL, label: 'Gemeinsam entscheiden, zum Beispiel im Konsens: wie fühlst du dich damit?', opts: ['Kenne ich und mag ich', 'Kenne ich nicht, probiere ich gern aus', 'Klingt anstrengend, aber okay', 'Eher nicht meins'] },
  konflikt: { typ: EINZEL, label: 'Wenn dich etwas an jemandem stört, was machst du meistens?', opts: ['Ich spreche es direkt an', 'Ich warte kurz ab und spreche es dann an', 'Ich bringe es beim Haustreffen ein', 'Ich schlucke es eher runter', 'Kommt drauf an'] },
}

const SKALEN = [
  { key: 'naehe', links: 'Ich brauche viel Rückzug', rechts: 'Ich bin gern viel mit anderen zusammen' },
  { key: 'ordnung', links: 'Eher ordentlich', rechts: 'Eher chaotisch' },
  { key: 'trubel', links: 'Ich mag es ruhig', rechts: 'Trubel und Besuch sind mir recht' },
  { key: 'rhythmus', links: 'Frühaufsteher', rechts: 'Nachteule' },
]

const SUBSTANZEN = [
  { key: 'rauchen', label: 'Rauchen' },
  { key: 'alkohol', label: 'Alkohol' },
  { key: 'andere', label: 'Andere Substanzen' },
]
const SUBSTANZ_OPTS = ['Passt für mich', 'In Maßen', 'Lieber nicht im Haus']

function Choice({ name, q, value, onChange }) {
  const multi = q.typ === MEHRFACH
  const selected = multi ? (value || []) : value
  function toggle(opt) {
    if (multi) {
      const set = new Set(selected)
      set.has(opt) ? set.delete(opt) : set.add(opt)
      onChange(name, Array.from(set))
    } else {
      onChange(name, selected === opt ? undefined : opt)
    }
  }
  return (
    <fieldset className={s.q}>
      <legend className={s.label}>{q.label}{q.pflicht && <span className={s.req}> *</span>}</legend>
      {q.hint && <div className={s.hint}>{q.hint}</div>}
      <div className={s.chips} role={multi ? 'group' : 'radiogroup'}>
        {q.opts.map(opt => {
          const on = multi ? selected.includes(opt) : selected === opt
          return (
            <button type="button" key={opt} role={multi ? 'checkbox' : 'radio'} aria-checked={on}
              className={on ? `${s.chip} ${s.chipOn}` : s.chip} onClick={() => toggle(opt)}>
              {opt}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function Section({ nr, title, children }) {
  return (
    <section className={s.card}>
      <h2 className={s.secTitle}><span className={s.secNr}>{nr}</span>{title}</h2>
      {children}
    </section>
  )
}

export default function Baumhaus() {
  const [name, setName] = useState('')
  const [kontaktweg, setKontaktweg] = useState([])
  const [kontaktSonst, setKontaktSonst] = useState('')
  const [telefon, setTelefon] = useState('')
  const [social, setSocial] = useState('')
  const [a, setA] = useState({})
  const [skala, setSkala] = useState({})
  const [subst, setSubst] = useState({})
  const [modell, setModell] = useState('')
  const [einzug, setEinzug] = useState('')
  const [werBistDu, setWerBistDu] = useState('')
  const [mitbringen, setMitbringen] = useState('')
  const [tier, setTier] = useState('')
  const [sonst, setSonst] = useState('')
  const [fragenAnUns, setFragenAnUns] = useState('')
  const [ok, setOk] = useState(false)
  const [status, setStatus] = useState('idle')
  const [fehler, setFehler] = useState('')

  const set = (k, v) => setA(prev => ({ ...prev, [k]: v }))
  const toggleKontakt = opt => setKontaktweg(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])

  async function submit(e) {
    e.preventDefault()
    setFehler('')
    const fehlt = []
    if (!name.trim()) fehlt.push('Name')
    if (kontaktweg.length === 0) fehlt.push('Kontaktweg')
    if (!telefon.trim()) fehlt.push('Handynummer')
    if (!a.suche) fehlt.push('Was du suchst')
    if (!werBistDu.trim()) fehlt.push('Wer bist du?')
    if (!ok) fehlt.push('Einverständnis zum Datenschutz')
    if (fehlt.length) { setFehler('Bitte noch ausfüllen: ' + fehlt.join(', ')); return }

    setStatus('sending')
    const kontakt = [...kontaktweg.filter(k => k !== 'Anders'), ...(kontaktweg.includes('Anders') && kontaktSonst.trim() ? [kontaktSonst.trim()] : [])]
    const antworten = {
      ...a,
      anderes_modell: modell.trim() || undefined,
      einzugsdatum: einzug || undefined,
      skalen_1_bis_5: skala,
      substanzen: subst,
      wer_bist_du: werBistDu.trim(),
      was_bringst_du_mit: mitbringen.trim() || undefined,
      tier: tier.trim() || undefined,
      sonst_noch: sonst.trim() || undefined,
      fragen_an_uns: fragenAnUns.trim() || undefined,
    }
    const { error } = await supabase.from('baumhaus_bewerbungen').insert({
      name: name.trim().slice(0, 200),
      kontaktweg: kontakt.join(', ').slice(0, 200),
      telefon: telefon.trim().slice(0, 60),
      social: social.trim().slice(0, 200) || null,
      antworten,
      datenschutz_ok: true,
    })
    if (error) { setStatus('idle'); setFehler('Das hat leider nicht geklappt. Versuch es bitte noch einmal.'); return }
    setStatus('sent')
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={s.page}>
      <Head>
        <title>Werde Teil der Baumhaus Gemeinschaft</title>
        <meta name="robots" content="noindex, nofollow, noarchive" />
        <meta property="og:title" content="Werde Teil der Baumhaus Gemeinschaft 🌳🏡" />
        <meta property="og:description" content="Wir suchen einen neuen Mitbewohner. Erzähl uns von dir!" />
        <meta property="og:image" content={HEADER_IMG} />
      </Head>

      <div className={s.wrap}>
        <img className={s.hero} src={HEADER_IMG} alt="" onError={e => { e.currentTarget.style.display = 'none' }} />

        <header className={s.card}>
          <h1 className={s.title}>Werde Teil der Baumhaus Gemeinschaft 🌳🏡</h1>
          {status === 'sent' ? (
            <div className={s.sent}>
              <div className={s.sentIcon}>💚</div>
              <p><strong>Danke, deine Bewerbung ist angekommen!</strong></p>
              <p>Wir lesen alles in Ruhe und melden uns über den Weg, den du angegeben hast.</p>
              <p className={s.sign}>Liebe Grüße<br />Die Baumhausis (und Stammgast Cevin)</p>
            </div>
          ) : (
            <>
              <p className={s.intro}>Schön, dass du da bist! Wir suchen jemanden, der mit uns zusammen wohnt, kocht, gärtnert und das Baumhaus mitgestaltet. Erzähl uns ein bisschen von dir.</p>
              <ul className={s.rules}>
                <li>⏱️ Dauert etwa 10 Minuten, das meiste ist zum Anklicken.</li>
                <li>✳️ Felder mit Sternchen sind Pflicht, alles andere ist freiwillig.</li>
                <li>🌱 Es gibt kein richtig oder falsch. Ehrlich hilft uns und dir am meisten.</li>
                <li>☕ Wenn es passt, laden wir dich danach zum Kennenlernen ein.</li>
              </ul>
            </>
          )}
        </header>

        {status !== 'sent' && (
          <form onSubmit={submit} noValidate>
            <Section nr="1" title="Kontakt">
              <label className={s.q}>
                <span className={s.label}>Dein Name<span className={s.req}> *</span></span>
                <input className={s.input} value={name} onChange={e => setName(e.target.value)} maxLength={200} autoComplete="name" />
              </label>
              <fieldset className={s.q}>
                <legend className={s.label}>So können wir dich erreichen<span className={s.req}> *</span></legend>
                <div className={s.chips}>
                  {['WhatsApp', 'Telegram', 'Anders'].map(opt => (
                    <button type="button" key={opt} role="checkbox" aria-checked={kontaktweg.includes(opt)}
                      className={kontaktweg.includes(opt) ? `${s.chip} ${s.chipOn}` : s.chip} onClick={() => toggleKontakt(opt)}>{opt}</button>
                  ))}
                </div>
                {kontaktweg.includes('Anders') && (
                  <input className={s.input} placeholder="Wie denn?" value={kontaktSonst} onChange={e => setKontaktSonst(e.target.value)} maxLength={100} />
                )}
              </fieldset>
              <label className={s.q}>
                <span className={s.label}>Deine Handynummer<span className={s.req}> *</span></span>
                <span className={s.hint}>Bitte doppelt prüfen</span>
                <input className={s.input} type="tel" value={telefon} onChange={e => setTelefon(e.target.value)} maxLength={60} autoComplete="tel" />
              </label>
              <label className={s.q}>
                <span className={s.label}>Dein Telegram- und/oder Instagram-Name</span>
                <input className={s.input} value={social} onChange={e => setSocial(e.target.value)} maxLength={200} />
              </label>
              <Choice name="quelle" q={FRAGEN.quelle} value={a.quelle} onChange={set} />
            </Section>

            <Section nr="2" title="Was du suchst">
              <Choice name="suche" q={FRAGEN.suche} value={a.suche} onChange={set} />
              {a.suche === 'Ich stelle mir ein anderes Modell vor' && (
                <label className={s.q}>
                  <span className={s.label}>Beschreib uns kurz deine Idee</span>
                  <textarea className={s.input} rows={3} value={modell} onChange={e => setModell(e.target.value)} maxLength={1500} />
                </label>
              )}
              <label className={s.q}>
                <span className={s.label}>Dein Wunsch-Einzugsdatum</span>
                <input className={s.input} type="date" value={einzug} onChange={e => setEinzug(e.target.value)} />
              </label>
              <Choice name="dauer" q={FRAGEN.dauer} value={a.dauer} onChange={set} />
              <Choice name="mitkommen" q={FRAGEN.mitkommen} value={a.mitkommen} onChange={set} />
              <Choice name="besuch" q={FRAGEN.besuch} value={a.besuch} onChange={set} />
            </Section>

            <Section nr="3" title="Wer du bist">
              <label className={s.q}>
                <span className={s.label}>Wer bist du? ❤️ Erzähle es uns<span className={s.req}> *</span></span>
                <textarea className={s.input} rows={4} value={werBistDu} onChange={e => setWerBistDu(e.target.value)} maxLength={3000} />
              </label>
              <label className={s.q}>
                <span className={s.label}>Was bringst du mit ins Baumhaus? 💚</span>
                <textarea className={s.input} rows={3} value={mitbringen} onChange={e => setMitbringen(e.target.value)} maxLength={2000} />
              </label>
              <label className={s.q}>
                <span className={s.label}>Wenn du ein Tier wärst, was für ein Tier wärst du und warum? 🐯</span>
                <input className={s.input} value={tier} onChange={e => setTier(e.target.value)} maxLength={300} />
              </label>
              <Choice name="reiz" q={FRAGEN.reiz} value={a.reiz} onChange={set} />
              <Choice name="bedenken" q={FRAGEN.bedenken} value={a.bedenken} onChange={set} />
              <Choice name="erfahrung" q={FRAGEN.erfahrung} value={a.erfahrung} onChange={set} />
              <Choice name="nervt" q={FRAGEN.nervt} value={a.nervt} onChange={set} />
              <Choice name="ichnerve" q={FRAGEN.ichnerve} value={a.ichnerve} onChange={set} />
            </Section>

            <Section nr="4" title="Alltag">
              <p className={s.hint} style={{ marginBottom: 14 }}>Tipp einfach an, wo du dich auf der Skala siehst.</p>
              {SKALEN.map(sk => (
                <fieldset className={s.scale} key={sk.key}>
                  <legend className={s.srOnly}>{sk.links} bis {sk.rechts}</legend>
                  <div className={s.scaleEnds}><span>{sk.links}</span><span>{sk.rechts}</span></div>
                  <div className={s.scaleDots}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button type="button" key={n} role="radio" aria-checked={skala[sk.key] === n} aria-label={String(n)}
                        className={skala[sk.key] === n ? `${s.dot} ${s.dotOn}` : s.dot}
                        onClick={() => setSkala(p => ({ ...p, [sk.key]: p[sk.key] === n ? undefined : n }))}>{n}</button>
                    ))}
                  </div>
                </fieldset>
              ))}
              <Choice name="essen" q={FRAGEN.essen} value={a.essen} onChange={set} />
              <Choice name="ernaehrung" q={FRAGEN.ernaehrung} value={a.ernaehrung} onChange={set} />
              <div className={s.q}>
                <div className={s.label}>Rauchen, Alkohol und andere Substanzen im Haus</div>
                {SUBSTANZEN.map(sb => (
                  <div className={s.substRow} key={sb.key}>
                    <span className={s.substName}>{sb.label}</span>
                    <div className={s.chips}>
                      {SUBSTANZ_OPTS.map(opt => (
                        <button type="button" key={opt} role="radio" aria-checked={subst[sb.key] === opt}
                          className={subst[sb.key] === opt ? `${s.chip} ${s.chipOn}` : s.chip}
                          onClick={() => setSubst(p => ({ ...p, [sb.key]: p[sb.key] === opt ? undefined : opt }))}>{opt}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section nr="5" title="Mitmachen">
              <Choice name="stunden" q={FRAGEN.stunden} value={a.stunden} onChange={set} />
              <Choice name="treffen" q={FRAGEN.treffen} value={a.treffen} onChange={set} />
              <Choice name="entscheiden" q={FRAGEN.entscheiden} value={a.entscheiden} onChange={set} />
              <Choice name="konflikt" q={FRAGEN.konflikt} value={a.konflikt} onChange={set} />
            </Section>

            <Section nr="6" title="Zum Schluss">
              <label className={s.q}>
                <span className={s.label}>Gibt es noch weitere Dinge, die du uns sagen möchtest? 💌</span>
                <textarea className={s.input} rows={3} value={sonst} onChange={e => setSonst(e.target.value)} maxLength={2000} />
              </label>
              <label className={s.q}>
                <span className={s.label}>Hast du Fragen an uns?</span>
                <input className={s.input} value={fragenAnUns} onChange={e => setFragenAnUns(e.target.value)} maxLength={500} />
              </label>
              <label className={s.consent}>
                <input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} />
                <span>Ich bin einverstanden, dass meine Angaben auf communet.net gespeichert und nur für die Mitbewohnersuche im Baumhaus verwendet werden. Nach der Entscheidung werden sie gelöscht.<span className={s.req}> *</span></span>
              </label>

              {fehler && <div className={s.error} role="alert">{fehler}</div>}
              <button type="submit" className={s.submit} disabled={status === 'sending'}>
                {status === 'sending' ? 'Wird gesendet …' : 'Bewerbung abschicken'}
              </button>
              <p className={s.sign}>Wir freuen uns auf deine Bewerbung &lt;3<br />Liebe Grüße<br />Die Baumhausis (und Stammgast Cevin)</p>
            </Section>
          </form>
        )}

        <img className={s.footerImg} src={FOOTER_IMG} alt="" onError={e => { e.currentTarget.style.display = 'none' }} />
        <p className={s.powered}>Läuft über <a href="https://communet.net">communet.net</a> · <a href="/datenschutz">Datenschutz</a> · <a href="/impressum">Impressum</a></p>
      </div>
    </div>
  )
}

Baumhaus.standalone = true
