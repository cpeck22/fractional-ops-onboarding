'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import SignupForm from '@/components/SignupForm';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const router = useRouter();

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    router.push('/questionnaire');
  };

  const handleSignupSuccess = () => {
    setShowSignup(false);
    // Show success message and switch to login
  };

  if (isAuthenticated) {
    return null; // Will redirect to questionnaire
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-fo-primary to-fo-accent rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-bold">FO</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-fo-primary">
            Welcome to Fractional Ops
          </h2>
          <p className="mt-2 text-sm text-fo-secondary">
            {showSignup 
              ? 'Create your account to begin onboarding'
              : 'Please log in to begin your onboarding process'
            }
          </p>
        </div>
        
        {showSignup ? (
          <SignupForm 
            onSignupSuccess={handleSignupSuccess}
            onSwitchToLogin={() => setShowSignup(false)}
          />
        ) : (
          <LoginForm 
            onLoginSuccess={handleLoginSuccess}
            onSwitchToSignup={() => setShowSignup(true)}
          />
        )}
      </div>
    </main>
  );
}
