import { lazy, Suspense } from 'react'
import SwitchToMobile from './components/SwitchToMobile'
import { currentUI } from './utils/device'

// Phones and in-app browsers (Instagram, TikTok, ...) get the app-style UI; everything else the full site.
// Each UI is its own chunk, so phones never download the desktop app (and its chart library) up front.
const MobileApp = lazy(() => import('./mobile/MobileApp.jsx'))
const App = lazy(() => import('./App.jsx'))
const ui = currentUI()
document.documentElement.dataset.ui = ui

// A case page arrives with the case already in #root (backend/services/case_pages.py): keep it on
// screen while the app's chunk loads, instead of a blank page
const prerendered = document.getElementById('root')?.innerHTML.trim()
const fallback = prerendered ? <div dangerouslySetInnerHTML={{ __html: prerendered }} /> : null

export default function Root() {
  return ui === 'mobile'
    ? <Suspense fallback={fallback}><MobileApp /></Suspense>
    : <><Suspense fallback={fallback}><App /></Suspense><SwitchToMobile /></>
}
