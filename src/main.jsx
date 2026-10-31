import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { GoogleAuthProvider } from './hooks/useGoogleAuth.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <GoogleAuthProvider>
        <App />
      </GoogleAuthProvider>
    </HashRouter>
  </StrictMode>,
)
