import React, { useEffect } from 'react'
import { HashRouter } from 'react-router-dom'
import AppRoutes from './routes/AppRoutes'
import ScrollToTop from './ScrollToTop'

function App() {
  useEffect(() => {
    try {
      if (!localStorage.getItem('skillchain_progress_clean_v3')) {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('skillchain_course_progress') || k.startsWith('skillchain_completed_lessons')) {
            localStorage.removeItem(k);
          }
        });
        localStorage.setItem('skillchain_progress_clean_v3', 'true');
      }
    } catch (e) {}
  }, []);

  return (
    <HashRouter>
      <ScrollToTop />
      <AppRoutes />
    </HashRouter>
  )
}

export default App
