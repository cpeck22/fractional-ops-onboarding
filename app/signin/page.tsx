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
          <div className="inline-block relative mb-2">
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
              BETA
            </span>
          </div>
          <div className="mx-auto h-32 w-64 mt-4">
            <Image
              src={Logo}
              alt="Fractional Ops logo"
              width={256}
              height={256}
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
        
        {/* Collaboration Warning Banner */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <div className="text-left">
              <p className="text-amber-900 font-semibold text-sm mb-1">
                Collaborating with Colleagues?
              </p>
              <p className="text-amber-800 text-sm">
                You must use the same login to see their saved answers!
              </p>
            </div>
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
