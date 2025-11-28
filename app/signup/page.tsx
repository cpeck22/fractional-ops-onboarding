'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AuthForm from '@/components/AuthForm';
import { getCurrentUser, supabase } from '@/lib/supabase';
import Logo from '../Fractional-Ops_Symbol_Main.png';

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';

export default function SignupPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('📝 Signup Page: Auth status:', session?.user?.email || 'No user');
      if (session?.user) {
        setIsAuthenticated(true);
        router.push('/questionnaire');
      }
    } catch (error) {
      console.error('📝 Signup Page: Auth check failed:', error);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    router.push('/questionnaire');
  };

  if (isAuthenticated) {
    return null; // Will redirect to questionnaire
  }

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
            Create Your Account
          </h1>
          <div className="text-lg text-gray-700 mb-8">
            Get started with your world-class Sales Strategy
          </div>
        </div>
        
        {/* Why Login? Video Explanation */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">
            Why do I need to login?
          </h3>
          <div className="relative w-full bg-black rounded-lg overflow-hidden shadow-xl" style={{ paddingTop: '75%' }}>
            <iframe 
              src="https://drive.google.com/file/d/12e2_ABddNtMe3CcH-rssjR45BSpRTMRE/preview"
              className="absolute top-0 left-0 w-full h-full"
              allow="autoplay"
              title="Why Login Explanation"
              style={{ border: 'none' }}
            />
          </div>
        </div>
        
        {/* Collaboration Warning Banner */}
        <div className="bg-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl flex-shrink-0">
              🤝
            </div>
            <div className="text-left">
              <h3 className="text-white font-bold text-xl mb-2">
                Collaborating with Colleagues?
              </h3>
              <p className="text-white text-base">
                You must use the same login to see their saved answers!
              </p>
            </div>
          </div>
        </div>
        
        <AuthForm 
          onAuthSuccess={handleAuthSuccess}
          showSignup={true}
          onSwitchToLogin={() => router.push('/signin')}
        />
      </div>
    </main>
  );
}
