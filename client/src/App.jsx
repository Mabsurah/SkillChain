import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import ScrollToTop from './ScrollToTop'; // 1. Import it here

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop /> {/* 2. Place it right here inside the router */}
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;