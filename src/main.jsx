import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

const loader = document.getElementById('app-loader')
if (loader) {
  loader.classList.add('fade-out')
  loader.addEventListener('transitionend', () => loader.remove(), { once: true })
}
