'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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
    console.log('🔐 ProtectedRoute: Starting auth check...');
    console.log('🔐 ProtectedRoute: Current user from QuestionnaireProvider:', currentUser?.email || 'No user');
    
    // Use the user from QuestionnaireProvider instead of checking auth independently
    if (currentUser) {
      console.log('🔐 ProtectedRoute: ✅ User from QuestionnaireProvider, setting user state');
      setUser(currentUser);
      setIsCheckingAuth(false);
    } else {
      console.log('🔐 ProtectedRoute: ❌ No user from QuestionnaireProvider, redirecting to signin');
      router.push('/signin');
    }
  }, [currentUser, router]);

  // Show loading while checking auth
  if (isCheckingAuth) {
    console.log('🔐 ProtectedRoute: Checking auth, showing loading...');
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
    console.log('🔐 ProtectedRoute: No user state, returning null (redirect in progress)');
    return null;
  }

  // User is authenticated, show the questionnaire
  console.log('🔐 ProtectedRoute: ✅ User authenticated, rendering children');
  return <>{children}</>;
}