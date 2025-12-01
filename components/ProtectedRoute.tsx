'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuestionnaire } from '@/components/QuestionnaireProvider';
import type { User } from '@supabase/supabase-js';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();
  const { currentUser } = useQuestionnaire();

  useEffect(() => {
    // Use the user from QuestionnaireProvider instead of checking auth independently
    if (currentUser) {
      setUser(currentUser);
      setIsCheckingAuth(false);
    } else {
      // Only redirect if we're sure there's no user (QuestionnaireProvider usually handles initial loading state)
      // We might want to wait a bit or check if QuestionnaireProvider is still loading
      const timer = setTimeout(() => {
        if (!currentUser) {
          router.push('/signin');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentUser, router]);

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If no user, don't render anything (redirect will happen)
  if (!user) {
    return null;
  }

  // User is authenticated, show the content
  // We no longer check for T&C here because it's enforced at signup
  return <>{children}</>;
}
