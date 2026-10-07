import'../styles/globals.css'
import{LanguageProvider}from'../lib/LanguageContext'
import{AuthProvider}from'../lib/AuthContext'
import Footer from'../components/Footer'
import PwaRegister from'../components/PwaRegister'
import InstallHint from'../components/InstallHint'
export default function App({Component,pageProps}){
return<LanguageProvider><AuthProvider><Component{...pageProps}/><Footer/><InstallHint/><PwaRegister/></AuthProvider></LanguageProvider>
}
