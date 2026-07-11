import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@strangr/ui/styles.css'
import './styles.css'
import { AdminApp } from './app.js'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
)
