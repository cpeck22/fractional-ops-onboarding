'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AuthForm from '@/components/AuthForm';
import Logo from '../Fractional-Ops_Symbol_Main.png';

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';

export default function SignInPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  console.log('🔑 SignInPage: Component rendered, isAuthenticated:', isAuthenticated);

  const handleAuthSuccess = () => {
    console.log('🔑 SignInPage: handleAuthSuccess called, setting isAuthenticated to true');
    setIsAuthenticated(true);
    console.log('🔑 SignInPage: Redirecting to /questionnaire');
    router.push('/questionnaire');
  };

  const handleBackToSignup = () => {
    console.log('🔑 SignInPage: handleBackToSignup called, redirecting to /signup');
    router.push('/signup');
  };

  if (isAuthenticated) {
    console.log('🔑 SignInPage: User is authenticated, returning null (redirect in progress)');
    return null; // Will redirect to questionnaire
  }

  console.log('🔑 SignInPage: Rendering sign-in form');

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 mb-6">
            <Image
              src={Logo}
              alt="Fractional Ops logo"
              width={128}
              height={128}
              priority
            />
          </div>
          <h1 className="text-4xl font-bold text-blue-600 mb-4">
            Welcome Back
          </h1>
          <div className="text-lg text-gray-700 mb-8">
            Sign in to continue your questionnaire
          </div>
        </div>
        
        <AuthForm 
          onAuthSuccess={handleAuthSuccess}
          showSignup={false}
          onSwitchToLogin={handleBackToSignup}
        />
      </div>
    </main>
  );
}
