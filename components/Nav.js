import Link from'next/link'
import{useRouter}from'next/router'
import{useLang}from'../lib/LanguageContext'
import styles from'./Nav.module.css'
export default function Nav(){
const router=useRouter()
const{lang,setLang,t}=useLang()
return(
<nav className={styles.nav}>
<Link href="/"className={styles.logo}>communet</Link>
<div className={styles.links}>
<Link href="/karte"className={`${styles.link}${router.pathname==='/karte'?' '+styles.active:''}`}>{t('nav_map')}</Link>
<Link href="/kommunen"className={`${styles.link}${router.pathname.startsWith('/kommunen')?' '+styles.active:''}`}>{t('nav_communities')}</Link>
<Link href="/angebote"className={`${styles.link}${router.pathname==='/angebote'?' '+styles.active:''}`}>{t('nav_offers')}</Link>
<div className={styles.langSwitch}>
<button className={`${styles.langBtn}${lang==='de'?' '+styles.langActive:''}`}onClick={()=>setLang('de')}>DE</button>
<button className={`${styles.langBtn}${lang==='en'?' '+styles.langActive:''}`}onClick={()=>setLang('en')}>EN</button>
</div>
<Link href="/registrieren"className={styles.cta}>{t('nav_join')}</Link>
</div>
</nav>
)
}
