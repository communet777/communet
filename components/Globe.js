import { useEffect, useRef } from 'react'

export default function Globe({ size = 320 }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const rotRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = size, H = size, CX = W / 2, CY = H / 2, R = size * 0.41

    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const OCEAN = dark ? '#0d2d1a' : '#1a6ab5'
    const GOLD  = dark ? '#d4b060' : '#b8892a'

    const cities = [
      [51.5,-0.1],[48.8,2.3],[52.5,13.4],[55.7,37.6],[59.9,30.3],
      [40.7,-74],[34.0,-118],[41.8,-87],[19.4,-99],[23.1,-82],
      [35.7,139],[31.2,121],[22.3,114],[28.6,77],[1.3,103],
      [-33.9,18.4],[-23.5,-46],[37.6,127],[30.0,31.2],[6.5,3.4],
      [55.6,12.6],[59.3,18.1],[60.2,24.9],[47.4,8.5],[48.2,16.4],
    ]

    function drawFrame(rot) {
      ctx.clearRect(0, 0, W, H)

      // Glow
      const glow = ctx.createRadialGradient(CX, CY, R * 0.4, CX, CY, R * 1.5)
      glow.addColorStop(0, 'rgba(30,80,180,0.15)')
      glow.addColorStop(1, 'rgba(5,13,26,0)')
      ctx.fillStyle = glow
      ctx.beginPath(); ctx.arc(CX, CY, R * 1.5, 0, Math.PI * 2); ctx.fill()

      // Ocean
      const ocean = ctx.createRadialGradient(CX - R * 0.3, CY - R * 0.3, R * 0.1, CX, CY, R)
      ocean.addColorStop(0, '#1a4a8a')
      ocean.addColorStop(0.5, '#0d2d5e')
      ocean.addColorStop(1, '#050d1a')
      ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2)
      ctx.fillStyle = ocean; ctx.fill()

      ctx.save()
      ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.clip()

      // Longitude bands
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + rot
        const cosA = Math.cos(a)
        if (cosA > 0) {
          const x = CX + Math.sin(a) * R
          const bw = R * 0.07 * cosA
          const g = ctx.createLinearGradient(x - bw, CY, x + bw, CY)
          g.addColorStop(0, 'rgba(80,140,255,0)')
          g.addColorStop(0.5, `rgba(80,140,255,${0.05 * cosA})`)
          g.addColorStop(1, 'rgba(80,140,255,0)')
          ctx.fillStyle = g
          ctx.save(); ctx.translate(x, CY); ctx.scale(bw, R)
          ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.restore(); ctx.fill()
        }
      }

      // City lights
      cities.forEach(([lat, lon]) => {
        const latR = lat * Math.PI / 180
        const lonR = (lon * Math.PI / 180) + rot
        const cosLon = Math.cos(lonR)
        if (cosLon < 0) return
        const x = CX + R * Math.cos(latR) * Math.sin(lonR)
        const y = CY - R * Math.sin(latR)
        const bright = cosLon * 0.9
        ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,220,120,${bright})`; ctx.fill()
        const cg = ctx.createRadialGradient(x, y, 0, x, y, 5)
        cg.addColorStop(0, `rgba(255,200,80,${bright * 0.35})`)
        cg.addColorStop(1, 'rgba(255,200,80,0)')
        ctx.fillStyle = cg
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill()
      })
      ctx.restore()

      // Fixed Flower of Life
      ctx.save()
      ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.clip()
      ctx.strokeStyle = GOLD; ctx.globalAlpha = 0.38; ctx.lineWidth = 0.65
      const fR = size * 0.069
      const rowH = fR * Math.sqrt(3)
      for (let row = -7; row <= 7; row++) {
        for (let col = -8; col <= 8; col++) {
          const ox = CX + col * fR * 2 + (row % 2) * fR
          const oy = CY + row * rowH
          ctx.beginPath(); ctx.arc(ox, oy, fR, 0, Math.PI * 2); ctx.stroke()
        }
      }
      ctx.globalAlpha = 1; ctx.restore()

      // Atmosphere
      const atm = ctx.createRadialGradient(CX, CY, R * 0.88, CX, CY, R * 1.08)
      atm.addColorStop(0, 'rgba(40,100,255,0)')
      atm.addColorStop(0.6, 'rgba(40,120,255,0.1)')
      atm.addColorStop(1, 'rgba(20,60,200,0)')
      ctx.fillStyle = atm
      ctx.beginPath(); ctx.arc(CX, CY, R * 1.08, 0, Math.PI * 2); ctx.fill()

      // Highlight
      const hi = ctx.createRadialGradient(CX - R * 0.35, CY - R * 0.3, 0, CX - R * 0.2, CY - R * 0.2, R * 0.65)
      hi.addColorStop(0, 'rgba(255,255,255,0.1)')
      hi.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = hi
      ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.fill()

      // Rim
      ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(100,160,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke()

      // Gold rings
      ctx.beginPath(); ctx.arc(CX, CY, R + size * 0.022, 0, Math.PI * 2)
      ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.globalAlpha = 0.4; ctx.stroke()
      ctx.beginPath(); ctx.arc(CX, CY, R + size * 0.044, 0, Math.PI * 2)
      ctx.lineWidth = 0.5; ctx.globalAlpha = 0.18
      ctx.setLineDash([3, 5]); ctx.stroke()
      ctx.setLineDash([]); ctx.globalAlpha = 1

      // Orbiting sparks
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + rot * 0.3
        const rx = R + size * 0.028
        const ox = CX + rx * Math.cos(a)
        const oy = CY + (rx * 0.35) * Math.sin(a)
        const bright = 0.5 + 0.5 * Math.sin(a * 3 + rot)
        ctx.beginPath(); ctx.arc(ox, oy, 1.8, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,210,80,${bright * 0.8})`; ctx.fill()
      }
    }

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      drawFrame(0.3)
    } else {
      function tick() {
        rotRef.current += 0.008
        drawFrame(rotRef.current)
        animRef.current = requestAnimationFrame(tick)
      }
      tick()
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ display: 'block', width: size, height: size }}
    />
  )
}
