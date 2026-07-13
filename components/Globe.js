import{useEffect,useRef}from'react'
export default function Globe({size=320}){
const canvasRef=useRef(null)
const animRef=useRef(null)
const rotRef=useRef(0)
useEffect(()=>{
const canvas=canvasRef.current
if(!canvas)return
const ctx=canvas.getContext('2d')
const W=size,CX=W/2,CY=W/2,R=size*.41
const GOLD=window.matchMedia('(prefers-color-scheme:dark)').matches?'#d4b060':'#c9a84c'
const cities=[[51.5,-0.1],[48.8,2.3],[52.5,13.4],[55.7,37.6],[35.7,139],[31.2,121],[28.6,77],[1.3,103],[-33.9,18.4],[-23.5,-46],[37.6,127],[30,31.2],[40.7,-74],[34,-118],[41.8,-87],[-26.75,152.85],[12,79.8],[-40.9,172.8],[29.9,35.1]]
function draw(rot){
ctx.clearRect(0,0,W,W)
const g=ctx.createRadialGradient(CX,CY,R*.4,CX,CY,R*1.5)
g.addColorStop(0,'rgba(30,80,180,0.15)');g.addColorStop(1,'rgba(5,13,26,0)')
ctx.fillStyle=g;ctx.beginPath();ctx.arc(CX,CY,R*1.5,0,Math.PI*2);ctx.fill()
const o=ctx.createRadialGradient(CX-R*.3,CY-R*.3,R*.1,CX,CY,R)
o.addColorStop(0,'#1a4a8a');o.addColorStop(.5,'#0d2d5e');o.addColorStop(1,'#050d1a')
ctx.beginPath();ctx.arc(CX,CY,R,0,Math.PI*2);ctx.fillStyle=o;ctx.fill()
ctx.save();ctx.beginPath();ctx.arc(CX,CY,R,0,Math.PI*2);ctx.clip()
ctx.strokeStyle=GOLD;ctx.lineWidth=.65;ctx.globalAlpha=.38
const fR=size*.069,rH=fR*Math.sqrt(3)
for(let row=-7;row<=7;row++)for(let col=-8;col<=8;col++){const ox=CX+col*fR*2+(row%2)*fR,oy=CY+row*rH;ctx.beginPath();ctx.arc(ox,oy,fR,0,Math.PI*2);ctx.stroke()}
ctx.globalAlpha=1
cities.forEach(([lat,lon])=>{
const latR=lat*Math.PI/180,lonR=(lon*Math.PI/180)+rot,cosL=Math.cos(lonR)
if(cosL<0)return
const x=CX+R*Math.cos(latR)*Math.sin(lonR),y=CY-R*Math.sin(latR)
ctx.beginPath();ctx.arc(x,y,1.2,0,Math.PI*2);ctx.fillStyle=`rgba(255,220,120,${cosL*.9})`;ctx.fill()
})
ctx.restore()
const hi=ctx.createRadialGradient(CX-R*.35,CY-R*.3,0,CX-R*.2,CY-R*.2,R*.65)
hi.addColorStop(0,'rgba(255,255,255,0.1)');hi.addColorStop(1,'rgba(255,255,255,0)')
ctx.fillStyle=hi;ctx.beginPath();ctx.arc(CX,CY,R,0,Math.PI*2);ctx.fill()
ctx.beginPath();ctx.arc(CX,CY,R,0,Math.PI*2);ctx.strokeStyle='rgba(100,160,255,0.35)';ctx.lineWidth=1.5;ctx.stroke()
ctx.beginPath();ctx.arc(CX,CY,R+size*.022,0,Math.PI*2);ctx.strokeStyle=GOLD;ctx.lineWidth=1;ctx.globalAlpha=.4;ctx.stroke()
ctx.setLineDash([3,5]);ctx.beginPath();ctx.arc(CX,CY,R+size*.044,0,Math.PI*2);ctx.lineWidth=.5;ctx.globalAlpha=.18;ctx.stroke()
ctx.setLineDash([]);ctx.globalAlpha=1
for(let i=0;i<12;i++){const a=(i/12)*Math.PI*2+rot*.3,rx=R+size*.028,ox=CX+rx*Math.cos(a),oy=CY+rx*.35*Math.sin(a),b=.5+.5*Math.sin(a*3+rot);ctx.beginPath();ctx.arc(ox,oy,1.8,0,Math.PI*2);ctx.fillStyle=`rgba(255,210,80,${b*.8})`;ctx.fill()}
}
if(window.matchMedia('(prefers-reduced-motion:reduce)').matches){draw(0.3)}
else{function tick(){rotRef.current+=.008;draw(rotRef.current);animRef.current=requestAnimationFrame(tick)}tick()}
return()=>{if(animRef.current)cancelAnimationFrame(animRef.current)}
},[size])
return<canvas ref={canvasRef}width={size}height={size}style={{display:'block',width:size,height:size}}/>
}
