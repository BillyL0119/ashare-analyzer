import { lazy, Suspense } from 'react'
import App from './App.jsx'
import SwitchToMobile from './components/SwitchToMobile'
import { currentUI } from './utils/device'

// Phones and in-app browsers (Instagram, TikTok, ...) get the app-style UI; everything else the full site.
const MobileApp = lazy(() => import('./mobile/MobileApp.jsx'))
const ui = currentUI()
document.documentElement.dataset.ui = ui

export default function Root() {
  return ui === 'mobile'
    ? <Suspense fallback={null}><MobileApp /></Suspense>
    : <><App /><SwitchToMobile /></>
}
