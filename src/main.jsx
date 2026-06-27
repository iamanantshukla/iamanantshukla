import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);

// Register the offline app-shell service worker (sub-project C). BASE_URL is '/' on the local
// build and '/iamanantshukla/' on the Pages build, so the SW scope matches either target. Only
// in production builds (a SW from a dev server would cache stale modules).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL || '/';
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
      /* SW registration failure must never block the app — it only adds offline resilience. */
    });
  });
}
