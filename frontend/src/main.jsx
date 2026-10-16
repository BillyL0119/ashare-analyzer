import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import Root from './Root.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import { startReveal } from './utils/reveal'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Root />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)

startReveal()
