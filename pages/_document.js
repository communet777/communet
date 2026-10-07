import{Html,Head,Main,NextScript}from'next/document'
const THEME_SCRIPT="try{var t=localStorage.getItem('communet_theme');document.documentElement.setAttribute('data-theme',t==='dark'||t==='auto'?t:'light')}catch(e){document.documentElement.setAttribute('data-theme','light')}"
export default function Document(){
return(
<Html lang="de">
<Head>
<script dangerouslySetInnerHTML={{__html:THEME_SCRIPT}}/>
<link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png"/>
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"/>
<link rel="shortcut icon" href="/favicon-32.png"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=""/>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Work+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
<meta name="theme-color" content="#173F4A"/>
<link rel="manifest" href="/manifest.webmanifest"/>
<meta name="mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-title" content="Communet"/>
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
<meta property="og:title" content="communet — Gemeinschaft neu gedacht"/>
<meta property="og:description" content="Weltkarte alternativer Gemeinschaften. Ökodörfer, Kommunen und Kollektive weltweit — kostenlos, werbefrei, ohne Algorithmus."/>
<meta property="og:image" content="https://www.communet.net/api/og?v=petrol"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:url" content="https://communet.net"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="communet"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:image" content="https://www.communet.net/api/og?v=petrol"/>
</Head>
<body>
<Main/>
<NextScript/>
</body>
</Html>
)
}
