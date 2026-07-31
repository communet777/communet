import{Html,Head,Main,NextScript}from'next/document'
export default function Document(){
return(
<Html lang="de">
<Head>
<link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png"/>
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"/>
<link rel="shortcut icon" href="/favicon-32.png"/>
<meta name="theme-color" content="#2d6a4f"/>
<meta property="og:title" content="communet — Gemeinschaft neu gedacht"/>
<meta property="og:description" content="Weltkarte alternativer Gemeinschaften. Ökodörfer, Kommunen und Kollektive weltweit — kostenlos, werbefrei, ohne Algorithmus."/>
<meta property="og:image" content="https://communet.net/communet_globe.png"/>
<meta property="og:url" content="https://communet.net"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="communet"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:image" content="https://communet.net/communet_globe.png"/>
</Head>
<body>
<Main/>
<NextScript/>
</body>
</Html>
)
}
