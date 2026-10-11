import { lazy, Suspense } from 'react'
import SwitchToMobile from './components/SwitchToMobile'
import { currentUI } from './utils/device'

// Phones and in-app browsers (Instagram, TikTok, ...) get the app-style UI; everything else the full site.
// Each UI is its own chunk, so phones never download the desktop app (and its chart library) up front.
const MobileApp = lazy(() => import('./mobile/MobileApp.jsx'))
const App = lazy(() => import('./App.jsx'))
const ui = currentUI()
document.documentElement.dataset.ui = ui

export default function Root() {
  return ui === 'mobile'
    ? <Suspense fallback={null}><MobileApp /></Suspense>
    : <><Suspense fallback={null}><App /></Suspense><SwitchToMobile /></>
}
