import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import Root from './Root.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import { reloadOnce } from './utils/chunkReload'

// A file of the old build failed to load after a deploy: switch this tab to the new build.
window.addEventListener('vite:preloadError', (event) => { if (reloadOnce()) event.preventDefault() })

// Web fonts: added from script so a slow or blocked fonts.googleapis.com (common in mainland China)
// cannot hold up the first paint; the page shows in the fallback fonts and swaps when they arrive.
// The URL is the one preloaded in index.html. An inline onload handler is not an option (CSP).
const fontsHref = document.querySelector('link[rel="preload"][as="style"]')?.href
if (fontsHref) {
  const fonts = document.createElement('link')
  fonts.rel = 'stylesheet'
  fonts.href = fontsHref
  document.head.appendChild(fonts)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Root />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
