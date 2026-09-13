import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import './index.css'

// Automatic cache flush for live Oracle DB synchronization
const CACHE_VERSION = 'v2026_09_12_oracle_live';
if (localStorage.getItem('skillchain_cache_ver') !== CACHE_VERSION) {
  const preserveKeys = ['userData', 'userRole', 'authToken', 'userEmail', 'participantId'];
  const preserved = {};
  preserveKeys.forEach(k => {
    const val = localStorage.getItem(k);
    if (val) preserved[k] = val;
  });
  localStorage.clear();
  sessionStorage.clear();
  Object.entries(preserved).forEach(([k, v]) => localStorage.setItem(k, v));
  localStorage.setItem('skillchain_cache_ver', CACHE_VERSION);
  console.log('[SkillChain] Stale client cache cleared and synchronized with live Oracle DB.');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
