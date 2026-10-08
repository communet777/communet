// Kleiner iCal-Leser und -Schreiber (ohne Abhängigkeiten) für den Kalender-Abgleich im Internen Bereich.
// Zeiten ohne Zeitzone gelten als Europe/Berlin.

const TZ = 'Europe/Berlin'
const dtf = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
})

export function berlinParts(date) {
  const o = {}
  for (const p of dtf.formatToParts(date)) o[p.type] = p.value
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, mi: +o.minute, s: +o.second }
}

function offsetMs(ts) {
  const p = berlinParts(new Date(ts))
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ts / 1000) * 1000
}

// Berliner Ortszeit -> Zeitpunkt
export function berlin(y, m, d, h = 0, mi = 0, s = 0) {
  const guess = Date.UTC(y, m - 1, d, h, mi, s)
  let t = guess - offsetMs(guess)
  const off2 = offsetMs(t)
  t = guess - off2
  return new Date(t)
}

const two = n => String(n).padStart(2, '0')
const ymdKey = (y, m, d) => `${y}${two(m)}${two(d)}`

function unescapeText(s) {
  return (s || '').replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\')
}

function parseLine(line) {
  let inQ = false, idx = -1
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') inQ = !inQ
    else if (c === ':' && !inQ) { idx = i; break }
  }
  if (idx < 0) return null
  const head = line.slice(0, idx)
  const value = line.slice(idx + 1)
  const parts = head.split(';')
  const name = parts[0].toUpperCase()
  const params = {}
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=')
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/"/g, '')
  }
  return { name, params, value }
}

// Wert einer DTSTART/DTEND-Zeile -> { allDay, y,m,d,h,mi } (in Berliner Ortszeit)
function parseDt(value, params) {
  const v = value.trim()
  if (params.VALUE === 'DATE' || /^\d{8}$/.test(v)) {
    return { allDay: true, y: +v.slice(0, 4), m: +v.slice(4, 6), d: +v.slice(6, 8), h: 0, mi: 0 }
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z?)$/)
  if (!m) return null
  const base = { allDay: false, y: +m[1], m: +m[2], d: +m[3], h: +m[4], mi: +m[5] }
  if (m[7] === 'Z') {
    const p = berlinParts(new Date(Date.UTC(base.y, base.m - 1, base.d, base.h, base.mi, +(m[6] || 0))))
    return { allDay: false, y: p.y, m: p.m, d: p.d, h: p.h, mi: p.mi }
  }
  return base
}

function parseRrule(v) {
  const r = {}
  for (const part of v.split(';')) {
    const [k, val] = part.split('=')
    if (k) r[k.toUpperCase()] = val
  }
  return r
}

const WD = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 0 }

// Tagesarithmetik auf Kalenderdaten (ohne Zeitzonenprobleme)
function addDaysYmd(y, m, d, n) {
  const x = new Date(Date.UTC(y, m - 1, d + n))
  return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate() }
}
function daysBetween(a, b) {
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86400000)
}

function expand(start, rr, horizonEnd, exdates) {
  const out = []
  const cmpKey = o => o.y * 10000 + o.m * 100 + o.d
  const hKey = cmpKey(horizonEnd)
  const interval = Math.max(1, parseInt(rr.INTERVAL || '1', 10) || 1)
  const count = rr.COUNT ? parseInt(rr.COUNT, 10) : Infinity
  let untilKey = Infinity
  if (rr.UNTIL) {
    const u = parseDt(rr.UNTIL, {})
    if (u) untilKey = cmpKey(u)
  }
  let n = 0
  const push = day => {
    const k = cmpKey(day)
    if (k > hKey || k > untilKey || n >= count) return false
    n++
    if (!exdates.has(ymdKey(day.y, day.m, day.d))) out.push({ ...day, h: start.h, mi: start.mi })
    return true
  }
  const freq = rr.FREQ
  let guard = 0
  if (freq === 'DAILY') {
    for (let i = 0; guard++ < 5000; i++) { if (!push(addDaysYmd(start.y, start.m, start.d, i * interval))) break }
  } else if (freq === 'WEEKLY') {
    const startWd = new Date(Date.UTC(start.y, start.m - 1, start.d)).getUTCDay()
    const days = rr.BYDAY ? rr.BYDAY.split(',').map(x => WD[x.slice(-2)]).filter(x => x !== undefined) : [startWd]
    const order = [...new Set(days)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    const monday = addDaysYmd(start.y, start.m, start.d, -((startWd + 6) % 7))
    let stop = false
    for (let w = 0; !stop && guard++ < 2000; w++) {
      for (const wd of order) {
        const day = addDaysYmd(monday.y, monday.m, monday.d, w * 7 * interval + ((wd + 6) % 7))
        if (cmpKey(day) < cmpKey(start)) continue
        if (!push(day)) { stop = true; break }
      }
    }
  } else if (freq === 'MONTHLY') {
    for (let i = 0; guard++ < 1000; i++) {
      const total = start.m - 1 + i * interval
      const y = start.y + Math.floor(total / 12), m = (total % 12) + 1
      const dim = new Date(Date.UTC(y, m, 0)).getUTCDate()
      if (start.d > dim) { if (cmpKey({ y, m, d: 1 }) > hKey) break; continue }
      if (!push({ y, m, d: start.d })) break
    }
  } else if (freq === 'YEARLY') {
    for (let i = 0; guard++ < 200; i++) {
      const y = start.y + i * interval
      const dim = new Date(Date.UTC(y, start.m, 0)).getUTCDate()
      if (start.d > dim) continue
      if (!push({ y, m: start.m, d: start.d })) break
    }
  } else {
    push({ y: start.y, m: start.m, d: start.d })
  }
  return out
}

// ICS-Text -> Liste von Ereignissen { uid, titel, beschreibung, ort, start:{...}, ende:{...}, allDay }
export function parseIcs(text, { vonTage = 365, bisTage = 500 } = {}) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n')
  const events = []
  let cur = null
  for (const raw of lines) {
    if (raw === 'BEGIN:VEVENT') { cur = []; continue }
    if (raw === 'END:VEVENT') { if (cur) events.push(cur); cur = null; continue }
    if (cur) { const p = parseLine(raw); if (p) cur.push(p) }
  }

  const now = Date.now()
  const from = berlinParts(new Date(now - vonTage * 86400000))
  const to = berlinParts(new Date(now + bisTage * 86400000))
  const fromKey = from.y * 10000 + from.m * 100 + from.d

  // Einzelne Änderungen an Serienterminen (RECURRENCE-ID) merken, damit sie nicht doppelt erscheinen
  const overridden = new Set()
  for (const props of events) {
    const uid = props.find(p => p.name === 'UID')?.value
    const rid = props.find(p => p.name === 'RECURRENCE-ID')
    if (uid && rid) { const d = parseDt(rid.value, rid.params); if (d) overridden.add(`${uid}|${ymdKey(d.y, d.m, d.d)}`) }
  }

  const out = []
  for (const props of events) {
    const get = n => props.find(p => p.name === n)
    if ((get('STATUS')?.value || '').toUpperCase() === 'CANCELLED') continue
    const ds = get('DTSTART')
    if (!ds) continue
    const start = parseDt(ds.value, ds.params)
    if (!start) continue
    const de = get('DTEND')
    let end = de ? parseDt(de.value, de.params) : null
    // Dauer in Minuten bzw. Tagen bestimmen
    let dauerTage = 0, dauerMin = 0
    if (start.allDay) {
      dauerTage = end ? Math.max(1, daysBetween(start, end)) : 1
    } else if (end) {
      const a = berlin(start.y, start.m, start.d, start.h, start.mi).getTime()
      const b = berlin(end.y, end.m, end.d, end.h, end.mi).getTime()
      dauerMin = Math.max(0, Math.round((b - a) / 60000))
    }
    const uid = get('UID')?.value || `${ymdKey(start.y, start.m, start.d)}-${get('SUMMARY')?.value || ''}`
    const rid = get('RECURRENCE-ID')
    const rrule = get('RRULE')
    const ex = new Set()
    for (const p of props.filter(x => x.name === 'EXDATE')) {
      for (const v of p.value.split(',')) { const d = parseDt(v, p.params); if (d) ex.add(ymdKey(d.y, d.m, d.d)) }
    }
    let starts
    if (rrule && !rid) {
      starts = expand(start, parseRrule(rrule.value), to, ex).filter(o => {
        if (overridden.has(`${uid}|${ymdKey(o.y, o.m, o.d)}`)) return false
        const e = addDaysYmd(o.y, o.m, o.d, start.allDay ? dauerTage : Math.floor(dauerMin / 1440))
        return e.y * 10000 + e.m * 100 + e.d >= fromKey
      })
    } else {
      starts = [start]
      const e = start.allDay ? addDaysYmd(start.y, start.m, start.d, dauerTage) : { y: (end || start).y, m: (end || start).m, d: (end || start).d }
      if (e.y * 10000 + e.m * 100 + e.d < fromKey) continue
    }
    for (const o of starts) {
      let endObj
      if (start.allDay) {
        const e = addDaysYmd(o.y, o.m, o.d, dauerTage)
        endObj = { y: e.y, m: e.m, d: e.d, h: 0, mi: 0 }
      } else if (rrule && !rid) {
        const t = berlin(o.y, o.m, o.d, o.h, o.mi).getTime() + dauerMin * 60000
        const p = berlinParts(new Date(t))
        endObj = { y: p.y, m: p.m, d: p.d, h: p.h, mi: p.mi }
      } else {
        endObj = end ? { y: end.y, m: end.m, d: end.d, h: end.h, mi: end.mi } : null
      }
      out.push({
        uid: rrule && !rid ? `${uid}#${ymdKey(o.y, o.m, o.d)}` : (rid ? `${uid}#${ymdKey(start.y, start.m, start.d)}` : uid),
        titel: unescapeText(get('SUMMARY')?.value) || '(ohne Titel)',
        beschreibung: unescapeText(get('DESCRIPTION')?.value) || null,
        ort: unescapeText(get('LOCATION')?.value) || null,
        allDay: start.allDay,
        start: { y: o.y, m: o.m, d: o.d, h: o.h, mi: o.mi },
        ende: endObj,
      })
    }
  }
  return out
}

// Ereignisse -> Zeilen für die Tabelle kommune_termine
export function eventsToRows(events, { art, gruppe, kommuneId, feedId, userId }) {
  const rows = []
  for (const ev of events) {
    let beginn, ende
    if (art === 'anwesenheit' || ev.allDay) {
      let e = ev.ende || ev.start
      // Ende ist bei Ganztägigen und bei Terminen um 00:00 exklusiv
      if (ev.ende && (ev.allDay || (e.h === 0 && e.mi === 0)) && daysBetween(ev.start, e) > 0) e = addDaysYmd(e.y, e.m, e.d, -1)
      beginn = berlin(ev.start.y, ev.start.m, ev.start.d, 0, 0)
      ende = berlin(e.y, e.m, e.d, 23, 59)
    } else {
      beginn = berlin(ev.start.y, ev.start.m, ev.start.d, ev.start.h, ev.start.mi)
      ende = ev.ende ? berlin(ev.ende.y, ev.ende.m, ev.ende.d, ev.ende.h, ev.ende.mi) : null
    }
    if (ende && ende < beginn) ende = beginn
    rows.push({
      kommune_id: kommuneId, feed_id: feedId, ical_uid: ev.uid, art,
      titel: ev.titel.slice(0, 300), beschreibung: ev.beschreibung ? ev.beschreibung.slice(0, 4000) : null,
      ort: ev.ort ? ev.ort.slice(0, 300) : null, gruppe: gruppe || null,
      beginn: beginn.toISOString(), ende: ende ? ende.toISOString() : null,
      sichtbarkeit: 'bewohner', erstellt_von: userId || null,
    })
  }
  return rows
}

// ---- Export
const esc = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
function fold(line) {
  const out = []
  let rest = line
  while (rest.length > 73) { out.push(rest.slice(0, 73)); rest = ' ' + rest.slice(73) }
  out.push(rest)
  return out.join('\r\n')
}
const utcStamp = d => `${d.getUTCFullYear()}${two(d.getUTCMonth() + 1)}${two(d.getUTCDate())}T${two(d.getUTCHours())}${two(d.getUTCMinutes())}${two(d.getUTCSeconds())}Z`

export function buildIcs(rows, kalenderName) {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Communet//Interner Bereich//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(kalenderName)}`, 'X-WR-TIMEZONE:Europe/Berlin']
  const stamp = utcStamp(new Date())
  for (const r of rows) {
    const b = new Date(r.beginn)
    const e = r.ende ? new Date(r.ende) : null
    L.push('BEGIN:VEVENT', `UID:${r.id}@communet.net`, `DTSTAMP:${stamp}`)
    if (r.art === 'anwesenheit') {
      const bp = berlinParts(b)
      const ep = berlinParts(e || b)
      const end = addDaysYmd(ep.y, ep.m, ep.d, 1)
      L.push(`DTSTART;VALUE=DATE:${ymdKey(bp.y, bp.m, bp.d)}`, `DTEND;VALUE=DATE:${ymdKey(end.y, end.m, end.d)}`)
    } else {
      L.push(`DTSTART:${utcStamp(b)}`, `DTEND:${utcStamp(e || new Date(b.getTime() + 3600000))}`)
    }
    const titel = r.art === 'anwesenheit' && r.gruppe ? `${r.gruppe}: ${r.titel}` : r.titel
    L.push(`SUMMARY:${esc(titel)}`)
    if (r.beschreibung) L.push(`DESCRIPTION:${esc(r.beschreibung)}`)
    if (r.ort) L.push(`LOCATION:${esc(r.ort)}`)
    L.push('END:VEVENT')
  }
  L.push('END:VCALENDAR')
  return L.map(fold).join('\r\n') + '\r\n'
}
