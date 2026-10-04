// Vorschaubild für Link-Vorschauen (WhatsApp, Instagram, Telegram …):
// Globus auf Petrol mit warmem Goldschein, 1200 × 630 px.
// Wird bei Abruf erzeugt, dadurch ist keine eigene Bilddatei nötig.
import { ImageResponse } from 'next/og'

export const config = { runtime: 'edge' }

export default function handler(req) {
  const origin = new URL(req.url).origin
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#173F4A',
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(233,173,85,0.28) 0%, rgba(233,173,85,0.08) 30%, rgba(23,63,74,0) 50%)',
        }}
      >
        <img src={`${origin}/communet_globe.png`} width={560} height={560} />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    }
  )
}
