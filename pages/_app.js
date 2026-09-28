import'../styles/globals.css'
import{LanguageProvider}from'../lib/LanguageContext'
import{AuthProvider}from'../lib/AuthContext'
import Footer from'../components/Footer'
export default function App({Component,pageProps}){
return<LanguageProvider><AuthProvider><Component{...pageProps}/><Footer/></AuthProvider></LanguageProvider>
}
