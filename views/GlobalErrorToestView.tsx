// FILE: views/GlobalErrorToestView.tsx
// views/GlobalErrorToastView.tsx
import React, { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';

// Assuming window.toast is globally available from Toaster.tsx
declare global {
  interface Window {
    toast: (message: string, options?: { variant?: 'default' | 'success' | 'error' }) => void;
  }
}

const GlobalErrorToastView: React.FC = () => {
  const error = useAppStore((state) => state.error);
  const clearError = useAppStore((state) => state.clearError);

  useEffect(() => {
    if (error && typeof window.toast === 'function') {
      window.toast(error, { variant: 'error' });
      // Clear the error from the store after showing it to prevent re-toasting on re-renders
      // or if the user navigates and comes back.
      const timer = setTimeout(() => {
        clearError();
      }, 7000); // Increased delay to allow user to read
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  return null; // This component doesn't render anything itself
};

export default GlobalErrorToastView;