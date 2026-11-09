import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { authStore } from './core/store/authStore.js'
import './index.css'
import App from './App.jsx'

void authStore.getState().initSession().catch((error) => {
  console.error('Échec de la restauration de session.', error)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
