import{Html,Head,Main,NextScript}from'next/document'
export default function Document(){
return(
<Html lang="de">
<Head>
<link rel="icon" href="/favicon.svg" type="image/svg+xml"/>
<link rel="shortcut icon" href="/favicon.svg"/>
<meta name="theme-color" content="#1a1c1a"/>
<meta property="og:title" content="communet — Gemeinschaft neu gedacht"/>
<meta property="og:description" content="Weltkarte alternativer Gemeinschaften. Ökodörfer, Kommunen und Kollektive weltweit — kostenlos, werbefrei, ohne Algorithmus."/>
<meta property="og:image" content="https://communet.net/communet_globe.png"/>
<meta property="og:url" content="https://communet.net"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="communet"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="communet — Gemeinschaft neu gedacht"/>
<meta name="twitter:description" content="Weltkarte alternativer Gemeinschaften. Ökodörfer, Kommunen und Kollektive weltweit."/>
<meta name="twitter:image" content="https://communet.net/communet_globe.png"/>
</Head>
<body>
<Main/>
<NextScript/>
</body>
</Html>
)
}
