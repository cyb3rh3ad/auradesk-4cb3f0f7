// Haptic feedback utility for mobile devices

export type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

/**
 * Trigger haptic feedback on supported devices
 * Uses the Vibration API with different patterns for different feedback types
 */
export const triggerHaptic = (type: HapticType = 'light'): void => {
  // Check if vibration is supported
  if (!('vibrate' in navigator)) {
    return;
  }

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(25);
        break;
      case 'heavy':
        navigator.vibrate(50);
        break;
      case 'selection':
        navigator.vibrate(5);
        break;
      case 'success':
        navigator.vibrate([10, 50, 20]);
        break;
      case 'warning':
        navigator.vibrate([30, 50, 30]);
        break;
      case 'error':
        navigator.vibrate([50, 30, 50, 30, 50]);
        break;
      default:
        navigator.vibrate(10);
    }
  } catch (e) {
    // Silently fail if vibration fails
    console.debug('Haptic feedback not available');
  }
};

/**
 * Hook-friendly wrapper for haptic feedback
 */
export const useHaptic = () => {
  return {
    light: () => triggerHaptic('light'),
    medium: () => triggerHaptic('medium'),
    heavy: () => triggerHaptic('heavy'),
    selection: () => triggerHaptic('selection'),
    success: () => triggerHaptic('success'),
    warning: () => triggerHaptic('warning'),
    error: () => triggerHaptic('error'),
    trigger: triggerHaptic,
  };
};
