import { useState, useEffect } from 'react';

export const useKeyboardVisibility = () => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const threshold = 150; // pixels difference to consider keyboard open

    const handleResize = () => {
      const heightDiff = window.innerHeight - viewport.height;
      setIsKeyboardVisible(heightDiff > threshold);
    };

    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);

    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  return isKeyboardVisible;
};
