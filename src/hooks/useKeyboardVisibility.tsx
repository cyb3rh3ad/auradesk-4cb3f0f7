import { useState, useEffect, useRef } from 'react';

/**
 * Detects the virtual keyboard on mobile devices.
 * 
 * Strategy: Only report keyboard as visible when BOTH conditions are true:
 * 1. An input/textarea is currently focused
 * 2. The visual viewport has shrunk significantly (>200px) compared to window.innerHeight
 * 
 * This prevents false positives from the system navigation bar hiding/showing
 * (which only changes the viewport by ~50-80px).
 */
export const useKeyboardVisibility = () => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const inputFocused = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const KEYBOARD_THRESHOLD = 200; // Keyboards are typically 250-400px tall

    const isInputElement = (el: EventTarget | null): boolean => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    };

    const checkKeyboard = () => {
      const vp = window.visualViewport;
      if (!vp || !inputFocused.current) {
        setIsKeyboardVisible(false);
        return;
      }
      const shrink = window.innerHeight - vp.height;
      setIsKeyboardVisible(shrink > KEYBOARD_THRESHOLD);
    };

    const handleFocusIn = (e: FocusEvent) => {
      if (isInputElement(e.target)) {
        inputFocused.current = true;
        // Delay to let keyboard animate open before measuring
        setTimeout(checkKeyboard, 350);
      }
    };

    const handleFocusOut = () => {
      inputFocused.current = false;
      // Small delay to handle switching between inputs
      setTimeout(() => {
        if (!inputFocused.current) {
          setIsKeyboardVisible(false);
        }
      }, 100);
    };

    const handleViewportResize = () => {
      checkKeyboard();
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    const vp = window.visualViewport;
    if (vp) {
      vp.addEventListener('resize', handleViewportResize);
    }

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      if (vp) {
        vp.removeEventListener('resize', handleViewportResize);
      }
    };
  }, []);

  return isKeyboardVisible;
};
