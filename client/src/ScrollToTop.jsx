import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // 1. Scroll the main browser window
    window.scrollTo(0, 0);

    // 2. Scroll common container classes if your layout uses inner scrolling
    const containers = document.querySelectorAll('.admin-layout, .participant-layout, .main-content, div');
    containers.forEach(el => {
      if (el) {
        el.scrollTop = 0;
      }
    });
  }, [pathname]);

  return null;
};

export default ScrollToTop;