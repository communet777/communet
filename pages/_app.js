import'../styles/globals.css'
import{LanguageProvider}from'../lib/LanguageContext'
import{AuthProvider}from'../lib/AuthContext'
import{ActiveProfileProvider}from'../lib/ActiveProfileContext'
import Footer from'../components/Footer'
import PwaRegister from'../components/PwaRegister'
import InstallHint from'../components/InstallHint'
import BottomNav from'../components/BottomNav'
export default function App({Component,pageProps}){
return<LanguageProvider><AuthProvider><ActiveProfileProvider><Component{...pageProps}/><Footer/><BottomNav/><InstallHint/><PwaRegister/></ActiveProfileProvider></AuthProvider></LanguageProvider>
}
