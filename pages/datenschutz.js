import Nav from'../components/Nav'

const H2 = { fontFamily:'Georgia,serif', fontWeight:400, fontSize:22, margin:'32px 0 8px' }
const H3 = { fontWeight:600, fontSize:16, margin:'20px 0 6px' }
const P = { margin:'0 0 12px' }

export default function Datenschutz(){
return(
<div>
<Nav/>
<div style={{maxWidth:760,margin:'0 auto',padding:'40px 20px 64px',lineHeight:1.7,color:'var(--text)'}}>
<h1 style={{fontFamily:'Georgia,serif',fontWeight:400,fontSize:32,margin:'0 0 24px'}}>Datenschutzerklärung</h1>

<h2 style={H2}>1. Datenschutz auf einen Blick</h2>
<p style={P}>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit deinen personenbezogenen Daten passiert, wenn du diese Website besuchst. Personenbezogene Daten sind alle Daten, mit denen du persönlich identifiziert werden kannst.</p>

<h2 style={H2}>2. Hosting und eingebundene Dienste</h2>
<h3 style={H3}>Hosting (Vercel)</h3>
<p style={P}>Diese Website wird extern gehostet bei Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, USA. Dabei werden IP-Adressen und technische Zugriffsdaten (Server-Log-Dateien) auf den Servern des Hosters gespeichert. Das externe Hosting erfolgt im Interesse einer sicheren, schnellen und effizienten Bereitstellung unseres Angebots (Art. 6 Abs. 1 lit. f DSGVO).</p>
<h3 style={H3}>Datenbank und Login (Supabase)</h3>
<p style={P}>Für Nutzerkonten, Profile und die Speicherung der Karten- und Katalogdaten nutzen wir Supabase. Die Server stehen in Irland (EU). Verarbeitet werden dabei deine Anmeldedaten, dein Profil und die Angebote, die du einstellst, auf Grundlage der Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO), da diese Verarbeitung für den Betrieb deines Kontos notwendig ist.</p>
<h3 style={H3}>Kartendarstellung (OpenStreetMap)</h3>
<p style={P}>Die Kartenansicht auf /karte und /versorgung wird mit Kartenmaterial von OpenStreetMap dargestellt. Beim Laden der Karte wird deine IP-Adresse an die Server der OpenStreetMap Foundation, St John's Innovation Centre, Cowley Road, Cambridge CB4 0WS, Vereinigtes Königreich, übertragen. Details: <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer" style={{color:'var(--g)'}}>osmfoundation.org/wiki/Privacy_Policy</a>.</p>
<h3 style={H3}>Ortssuche (Nominatim)</h3>
<p style={P}>Das Suchfeld auf der Karte und die Adressanzeige bei Wasserquellen nutzen den offenen Adressdienst Nominatim von OpenStreetMap. Deine Sucheingabe bzw. die aufgerufenen Koordinaten werden dafür direkt von deinem Browser an die Server von OpenStreetMap übermittelt.</p>
<h3 style={H3}>Bilder (Wikimedia)</h3>
<p style={P}>Bei Wasserquellen mit Hintergrundinformationen zeigen wir teilweise Fotos von Wikimedia Commons an. Beim Laden dieser Bilder wird deine IP-Adresse an Server der Wikimedia Foundation, 1 Montgomery Street, San Francisco, CA 94104, USA übertragen. Details: <a href="https://foundation.wikimedia.org/wiki/Policy:Privacy_policy" target="_blank" rel="noopener noreferrer" style={{color:'var(--g)'}}>foundation.wikimedia.org/wiki/Policy:Privacy_policy</a>.</p>
<h3 style={H3}>Kartensymbole (Cloudflare)</h3>
<p style={P}>Die Marker-Symbole auf Detailseiten werden über das Netzwerk von Cloudflare (cdnjs) ausgeliefert. Dabei wird deine IP-Adresse an Cloudflare übertragen.</p>

<h2 style={H2}>3. Allgemeine Hinweise und Pflichtinformationen</h2>
<h3 style={H3}>Hinweis zur verantwortlichen Stelle</h3>
<p style={P}>Jan Lucas Abram<br/>Jan-Wellemstraße 22<br/>51429 Bergisch Gladbach<br/>E-Mail: <a href="mailto:team@communet.net" style={{color:'var(--g)'}}>team@communet.net</a></p>
<h3 style={H3}>Speicherdauer</h3>
<p style={P}>Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt wurde, verbleiben deine personenbezogenen Daten bei uns, bis der Zweck für die Datenverarbeitung entfällt oder du eine Löschung deines Kontos beantragst. Gesetzliche Aufbewahrungsfristen bleiben unberührt.</p>
<h3 style={H3}>Empfänger von personenbezogenen Daten</h3>
<p style={P}>Wir geben personenbezogene Daten nur dann an die oben genannten externen Stellen weiter, wenn dies zur Bereitstellung der Website erforderlich ist. Mit unseren Dienstleistern bestehen, soweit erforderlich, Verträge zur Auftragsverarbeitung.</p>
<h3 style={H3}>Auskunft, Berichtigung und Löschung</h3>
<p style={P}>Du hast jederzeit das Recht auf unentgeltliche Auskunft über deine gespeicherten personenbezogenen Daten sowie ein Recht auf Berichtigung oder Löschung dieser Daten. Hierzu kannst du dich jederzeit an uns wenden.</p>
<h3 style={H3}>Beschwerderecht bei der zuständigen Aufsichtsbehörde</h3>
<p style={P}>Im Falle von Verstößen gegen die DSGVO steht dir ein Beschwerderecht bei einer Aufsichtsbehörde zu, insbesondere in dem Mitgliedstaat deines gewöhnlichen Aufenthalts, deines Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes.</p>

<h2 style={H2}>4. Deine Daten bei Communet</h2>
<h3 style={H3}>Kontaktformular</h3>
<p style={P}>Wenn du das Kontaktformular unter /kontakt nutzt, werden deine Angaben (Name, sofern angegeben, E-Mail-Adresse und Nachricht) bei uns in der Datenbank gespeichert, damit wir dein Anliegen bearbeiten können. Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b bzw. lit. f DSGVO (Bearbeitung deiner Anfrage). Die Daten verbleiben bei uns, bis dein Anliegen abgeschlossen ist oder du eine Löschung verlangst.</p>
<h3 style={H3}>Registrierung und Nutzerkonto</h3>
<p style={P}>Bei der Registrierung erhebst du E-Mail-Adresse, gewählten Namen sowie – bei Kommunen-Profilen – zusätzliche Angaben wie Ort, Beschreibung und Kontaktdaten, die du selbst einträgst. Die Verarbeitung erfolgt zur Bereitstellung deines Nutzerkontos (Art. 6 Abs. 1 lit. b DSGVO).</p>
<h3 style={H3}>Server-Log-Dateien</h3>
<p style={P}>Beim Besuch der Website erhebt der Hoster automatisch technische Daten (Browsertyp, Betriebssystem, Uhrzeit der Anfrage, IP-Adresse) in Server-Log-Dateien. Eine Zusammenführung mit anderen Datenquellen erfolgt nicht.</p>
<h3 style={H3}>Cookies und lokale Speicherung</h3>
<p style={P}>Wir setzen keine Analyse- oder Werbe-Cookies ein. Deine Anmeldung sowie deine Spracheinstellung werden technisch notwendig im lokalen Speicher deines Browsers abgelegt (Art. 6 Abs. 1 lit. f DSGVO), damit du eingeloggt bleibst bzw. deine Sprachwahl erhalten bleibt. Diese Daten werden nicht an uns übertragen und verlassen dein Gerät nicht.</p>

<p style={{fontSize:12,color:'var(--muted)',marginTop:32}}>Grundgerüst dieses Textes: <a href="https://www.e-recht24.de/muster-datenschutzerklaerung.html" target="_blank" rel="noopener noreferrer" style={{color:'var(--muted)'}}>https://www.e-recht24.de/muster-datenschutzerklaerung.html</a></p>
</div>
</div>
)
}
