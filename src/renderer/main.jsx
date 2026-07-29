import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ErrorBoundary } from './ErrorBoundary.jsx'
import './index.css'

// Erros globais de JS fora do React (scripts async, etc.)
window.addEventListener('error', (e) => {
  window.api?.app?.reportError?.({ message: e.message, stack: e.error?.stack, source: e.filename })
})
window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason instanceof Error ? e.reason.message : String(e.reason)
  window.api?.app?.reportError?.({ message: msg, stack: e.reason?.stack, source: 'unhandledRejection' })
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
