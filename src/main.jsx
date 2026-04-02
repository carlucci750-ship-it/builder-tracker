import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Claude provides window.storage; in the browser we use localStorage instead.
if (!window.storage) {
  window.storage = {
    get: async (key) => {
      try {
        const v = localStorage.getItem(key)
        return v != null ? { value: v } : null
      } catch {
        return null
      }
    },
    set: async (key, val) => {
      localStorage.setItem(key, val)
    },
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
