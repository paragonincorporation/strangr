import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@strangr/ui/styles.css'
import './styles.css'
import { WebApp } from './app.js'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <WebApp />
  </StrictMode>,
)
