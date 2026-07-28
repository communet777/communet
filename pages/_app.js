import'../styles/globals.css'
import{LanguageProvider}from'../lib/LanguageContext'
import{AuthProvider}from'../lib/AuthContext'
export default function App({Component,pageProps}){
return<LanguageProvider><AuthProvider><Component{...pageProps}/></AuthProvider></LanguageProvider>
}
