'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UnsavedChangesWarningProps {
  hasUnsavedChanges: boolean;
  message?: string;
}

/**
 * Component that warns users when they try to leave a page with unsaved changes
 * Shows browser's native confirmation dialog
 */
export default function UnsavedChangesWarning({ 
  hasUnsavedChanges,
  message = 'You have unsaved changes. Are you sure you want to leave this page?'
}: UnsavedChangesWarningProps) {
  
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    // Warn user when closing tab or navigating away via browser controls
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message; // Most browsers show their own message
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, message]);

  return null; // This component doesn't render anything
}
