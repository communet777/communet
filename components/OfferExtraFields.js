export const EMPTY_EXTRA = { verguetung: '', verguetung_info: '', unterkunft: '', verpflegung: '', kosten_info: '', stunden_pro_tag: '', plaetze: '', mindestdauer: '', hausregeln: '', essen_modus: '' }
export const ESSEN = [['', '– keine Angabe –'], ['versorgt', 'Für Essen ist gesorgt (Veranstalter)'], ['gemeinschaft', 'Gemeinschaftsessen (mehrere Mahlzeiten, wechselnde Köche)'], ['buffet', 'Buffet (jeder bringt etwas mit)']]
export const VERGUETUNG = ['', 'Ehrenamtlich / unentgeltlich', 'Aufwandsentschädigung', 'Bezahlt']
export const LEISTUNG = ['', 'Nicht enthalten', 'Aufs Haus', 'Gegen Beitrag']

export function extraFromOffer(o) {
  return { verguetung: o.verguetung || '', verguetung_info: o.verguetung_info || '', unterkunft: o.unterkunft || '', verpflegung: o.verpflegung || '', kosten_info: o.kosten_info || '', stunden_pro_tag: o.stunden_pro_tag || '', plaetze: o.plaetze == null ? '' : String(o.plaetze), mindestdauer: o.mindestdauer || '', hausregeln: o.hausregeln || '', essen_modus: o.essen_modus || '' }
}
export function extraToFields(e) {
  return { verguetung: e.verguetung || null, verguetung_info: e.verguetung_info || null, unterkunft: e.unterkunft || null, verpflegung: e.verpflegung || null, kosten_info: e.kosten_info || null, stunden_pro_tag: e.stunden_pro_tag || null, plaetze: e.plaetze ? Math.max(1, parseInt(e.plaetze, 10) || 0) || null : null, mindestdauer: e.mindestdauer || null, hausregeln: e.hausregeln || null, essen_modus: e.essen_modus || null }
}

export default function OfferExtraFields({ value, onChange, styles, rowClass }) {
  const set = (k, v) => onChange({ ...value, [k]: v })
  const sel = (k, opts) => (
    <select value={value[k]} onChange={e => set(k, e.target.value)}>
      {opts.map(t => <option key={t} value={t}>{t || '– keine Angabe –'}</option>)}
    </select>
  )
  return (
    <>
      <div className={rowClass}>
        <div className={styles.field}><label>Vergütung</label>{sel('verguetung', VERGUETUNG)}</div>
        <div className={styles.field}><label>Details Vergütung</label><input type="text" value={value.verguetung_info} onChange={e => set('verguetung_info', e.target.value)} placeholder="z.B. 100 € / Woche"/></div>
      </div>
      <div className={rowClass}>
        <div className={styles.field}><label>Arbeitszeit pro Tag</label><input type="text" value={value.stunden_pro_tag} onChange={e => set('stunden_pro_tag', e.target.value)} placeholder="z.B. 4–5 Std., Mo–Fr"/></div>
        <div className={styles.field}><label>Freie Plätze</label><input type="number" min="1" inputMode="numeric" value={value.plaetze} onChange={e => set('plaetze', e.target.value)} placeholder="z.B. 6"/></div>
      </div>
      <div className={styles.field}><label>Mindestdauer</label><input type="text" value={value.mindestdauer} onChange={e => set('mindestdauer', e.target.value)} placeholder="z.B. 1 Woche, oder: keine"/></div>
      <div className={rowClass}>
        <div className={styles.field}><label>Unterkunft</label>{sel('unterkunft', LEISTUNG)}</div>
        <div className={styles.field}><label>Verpflegung</label>{sel('verpflegung', LEISTUNG)}</div>
      </div>
      <div className={styles.field}><label>Essensorganisation</label>
        <select value={value.essen_modus} onChange={e => set('essen_modus', e.target.value)}>{ESSEN.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </div>
      <div className={styles.field}><label>Weitere Infos zu Kosten / Versorgung</label>
        <textarea rows={2} value={value.kosten_info} onChange={e => set('kosten_info', e.target.value)} placeholder="z.B. Mahlzeiten aufs Haus, Schlafplatz im Gemeinschaftszimmer, 5 € Beitrag/Tag"/>
      </div>
      <div className={styles.field}><label>Hausregeln</label>
        <textarea rows={2} value={value.hausregeln} onChange={e => set('hausregeln', e.target.value)} placeholder="z.B. Rauchen nur draußen, Ruhezeit ab 22 Uhr"/>
      </div>
    </>
  )
}
