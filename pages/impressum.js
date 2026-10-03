import Nav from'../components/Nav'

export default function Impressum(){
return(
<div>
<Nav/>
<div style={{maxWidth:680,margin:'0 auto',padding:'40px 20px 64px',lineHeight:1.7,color:'var(--text)'}}>
<h1 style={{fontFamily:'Georgia,serif',fontWeight:400,fontSize:32,margin:'0 0 24px'}}>Impressum</h1>
<p>Jan Lucas Abram<br/>Jan-Wellemstraße 22<br/>51429 Bergisch Gladbach</p>
<h2 style={{fontFamily:'Georgia,serif',fontWeight:400,fontSize:22,margin:'32px 0 8px'}}>Kontakt</h2>
<p>E-Mail: <a href="mailto:team@communet.net"style={{color:'var(--g)'}}>team@communet.net</a><br/>Oder über unser <a href="/kontakt"style={{color:'var(--g)'}}>Kontaktformular</a></p>
<p style={{fontSize:12,color:'var(--muted)',marginTop:32}}>Quelle: <a href="https://www.e-recht24.de/impressum-generator.html"target="_blank"rel="noopener noreferrer"style={{color:'var(--muted)'}}>https://www.e-recht24.de/impressum-generator.html</a></p>
</div>
</div>
)
}
