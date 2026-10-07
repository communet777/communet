export const EMPTY_EXTRA = { verguetung: '', verguetung_info: '', unterkunft: '', verpflegung: '', kosten_info: '' }
export const VERGUETUNG = ['', 'Ehrenamtlich / unentgeltlich', 'Aufwandsentschädigung', 'Bezahlt']
export const LEISTUNG = ['', 'Nicht enthalten', 'Aufs Haus', 'Gegen Beitrag']

export function extraFromOffer(o) {
  return { verguetung: o.verguetung || '', verguetung_info: o.verguetung_info || '', unterkunft: o.unterkunft || '', verpflegung: o.verpflegung || '', kosten_info: o.kosten_info || '' }
}
export function extraToFields(e) {
  return { verguetung: e.verguetung || null, verguetung_info: e.verguetung_info || null, unterkunft: e.unterkunft || null, verpflegung: e.verpflegung || null, kosten_info: e.kosten_info || null }
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
        <div className={styles.field}><label>Unterkunft</label>{sel('unterkunft', LEISTUNG)}</div>
        <div className={styles.field}><label>Verpflegung</label>{sel('verpflegung', LEISTUNG)}</div>
      </div>
      <div className={styles.field}><label>Weitere Infos zu Kosten / Versorgung</label>
        <textarea rows={2} value={value.kosten_info} onChange={e => set('kosten_info', e.target.value)} placeholder="z.B. Mahlzeiten aufs Haus, Schlafplatz im Gemeinschaftszimmer, 5 € Beitrag/Tag"/>
      </div>
    </>
  )
}
