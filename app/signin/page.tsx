'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AuthForm from '@/components/AuthForm';
import Logo from '../Fractional-Ops_Symbol_Main.png';
import { Users } from 'lucide-react';

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
    <main className="min-h-screen flex items-center justify-center px-4 bg-fo-bg-light">
      <div className="max-w-md w-full space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-fo-border p-8">
          <div className="text-center mb-6">
            <div className="inline-block relative mb-2">
              <span className="bg-fo-primary text-white text-xs font-bold px-2 py-1 rounded">
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
            <h1 className="text-4xl font-bold text-fo-primary mb-4">
              Welcome Back
            </h1>
            <div className="text-lg text-fo-text-secondary mb-8">
              Sign in to continue your questionnaire
            </div>
          </div>
          
          {/* Collaboration Warning Banner */}
          <div className="bg-fo-sidebar-dark rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Users className="w-8 h-8 text-gray-300" strokeWidth={2} />
              </div>
              <div className="text-left">
                <h3 className="text-white font-semibold text-xl mb-2">
                  Collaborating with Colleagues?
                </h3>
                <p className="text-gray-300 text-base font-normal">
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
      </div>
    </main>
  );
}
