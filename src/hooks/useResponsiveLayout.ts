import { useState, useEffect } from 'react';

interface UseResponsiveLayoutReturn {
  isMobile: boolean;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

export const useResponsiveLayout = (): UseResponsiveLayoutReturn => {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Check if it's a touch device or small screen
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      const isLandscapeMobile = window.innerWidth > window.innerHeight && window.innerHeight < 500; // Landscape mobile
      
      // Consider it mobile if: touch device, small screen, or landscape with low height
      const isMobileDevice = hasTouch || isSmallScreen || isLandscapeMobile;
      
      
      setIsMobile(isMobileDevice);
      
      // Sidebar should work on all screen sizes - no restrictions
    };

    // Check initial
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [sidebarOpen]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return {
    isMobile,
    sidebarOpen,
    toggleSidebar,
    closeSidebar
  };
};