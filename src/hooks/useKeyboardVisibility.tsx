import { useState, useEffect, useCallback } from 'react';

export const useKeyboardVisibility = () => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const checkKeyboard = useCallback(() => {
    const viewport = window.visualViewport;
    if (viewport) {
      const heightDiff = window.innerHeight - viewport.height;
      return heightDiff > 100;
    }
    return false;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let focusedInput = false;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        focusedInput = true;
        // Small delay to let the keyboard animate open
        setTimeout(() => {
          if (focusedInput) setIsKeyboardVisible(true);
        }, 300);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      focusedInput = false;
      // Small delay to prevent flicker when switching between inputs
      setTimeout(() => {
        if (!focusedInput) setIsKeyboardVisible(false);
      }, 100);
    };

    const handleViewportResize = () => {
      const isOpen = checkKeyboard();
      if (isOpen) {
        setIsKeyboardVisible(true);
      } else if (!focusedInput) {
        setIsKeyboardVisible(false);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    const viewport = window.visualViewport;
    if (viewport) {
      viewport.addEventListener('resize', handleViewportResize);
    }

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      if (viewport) {
        viewport.removeEventListener('resize', handleViewportResize);
      }
    };
  }, [checkKeyboard]);

  return isKeyboardVisible;
};
