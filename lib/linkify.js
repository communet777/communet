import Link from 'next/link'

// Macht Links in Nachrichten klickbar.
// Links auf communet.net öffnen im selben Fenster – in der installierten App bleiben sie damit in der App.
// Fremde Links öffnen in einem neuen Tab.
const URL_RE = /(https?:\/\/[^\s<>"']+|(?:www\.)?communet\.net\/[^\s<>"']*)/gi

export function linkify(text) {
  if (!text) return text
  const parts = []
  let last = 0
  let m
  URL_RE.lastIndex = 0
  while ((m = URL_RE.exec(text))) {
    let raw = m[0].replace(/[.,;:!?)]+$/, '') // Satzzeichen am Ende gehören nicht zum Link
    const start = m.index
    if (start > last) parts.push(text.slice(last, start))
    const href = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw
    let u = null
    try { u = new URL(href) } catch (e) {}
    const internal = u && /(^|\.)communet\.net$/i.test(u.hostname)
    const style = { color: 'inherit', textDecoration: 'underline', wordBreak: 'break-all' }
    parts.push(
      internal
        ? <Link key={start} href={u.pathname + u.search + u.hash} style={style}>{raw}</Link>
        : <a key={start} href={href} target="_blank" rel="noopener noreferrer" style={style}>{raw}</a>
    )
    last = start + raw.length
    URL_RE.lastIndex = last
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}
