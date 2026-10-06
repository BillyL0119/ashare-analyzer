import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import { currentUI } from './utils/device'

// Phones and in-app browsers (Instagram, TikTok, ...) get the app-style UI; everything else the full site.
const MobileApp = lazy(() => import('./mobile/MobileApp.jsx'))
const ui = currentUI()
document.documentElement.dataset.ui = ui

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        {ui === 'mobile' ? <Suspense fallback={null}><MobileApp /></Suspense> : <App />}
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
