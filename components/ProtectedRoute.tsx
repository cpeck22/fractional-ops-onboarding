'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkTermsAcceptance } from '@/lib/supabase';
import { useQuestionnaire } from '@/components/QuestionnaireProvider';
import TermsAndConditionsModal from '@/components/TermsAndConditionsModal';
import type { User } from '@supabase/supabase-js';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const router = useRouter();
  const { currentUser } = useQuestionnaire();

  useEffect(() => {
    console.log('🔐 ProtectedRoute: Starting auth check...');
    console.log('🔐 ProtectedRoute: Current user from QuestionnaireProvider:', currentUser?.email || 'No user');
    
    // Use the user from QuestionnaireProvider instead of checking auth independently
    if (currentUser) {
      console.log('🔐 ProtectedRoute: ✅ User from QuestionnaireProvider, checking T&C status');
      setUser(currentUser);
      checkTermsStatus(currentUser);
    } else {
      console.log('🔐 ProtectedRoute: ❌ No user from QuestionnaireProvider, redirecting to signin');
      router.push('/signin');
    }
  }, [currentUser, router]);

  const checkTermsStatus = async (user: User) => {
    console.log('📜 ProtectedRoute: Checking T&C acceptance status...');
    const { accepted } = await checkTermsAcceptance(user.id);
    
    if (!accepted) {
      console.log('📜 ProtectedRoute: User has NOT accepted T&C, showing modal');
      setShowTermsModal(true);
    } else {
      console.log('📜 ProtectedRoute: ✅ User has accepted T&C');
    }
    
    setIsCheckingAuth(false);
  };

  const handleTermsAccepted = () => {
    console.log('📜 ProtectedRoute: T&C accepted, hiding modal');
    setShowTermsModal(false);
  };

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

  // If user hasn't accepted T&C, show the modal
  if (showTermsModal) {
    console.log('🔐 ProtectedRoute: Showing T&C modal');
    return (
      <TermsAndConditionsModal
        userId={user.id}
        userEmail={user.email!}
        onAccept={handleTermsAccepted}
      />
    );
  }

  // User is authenticated and has accepted T&C, show the content
  console.log('🔐 ProtectedRoute: ✅ User authenticated and T&C accepted, rendering children');
  return <>{children}</>;
}