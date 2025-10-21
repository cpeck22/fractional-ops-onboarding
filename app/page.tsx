'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getCurrentUser, supabase } from '@/lib/supabase';
import Logo from './Fractional-Ops_Symbol_Main.png';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🏠 Home Page: Auth status:', session?.user?.email || 'No user');
      if (session?.user) {
        setIsAuthenticated(true);
        router.push('/questionnaire');
      }
    } catch (error) {
      console.error('🏠 Home Page: Auth check failed:', error);
    }
  };

  if (isAuthenticated) {
    return null; // Will redirect to questionnaire
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-100">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-32 w-64 mt-16">
            <Image
              src={Logo}
              alt="Fractional Ops logo"
              width={256}
              height={256}
              priority
            />
          </div>
        </div>
        
        <div className="text-left">
          <h1 className="text-4xl font-bold text-blue-600 mb-6">
            Get Ready...
          </h1>
          <div className="text-lg text-gray-700 mb-2">
            You're about to get a world-class
          </div>
          <div className="text-lg text-gray-700 mb-2">
            Sales Strategy.
          </div>
          <div className="text-base text-gray-700 mb-8">
            In a format all the best <strong>AI tools</strong> can use automatically.
          </div>
        </div>
        
        <div className="text-left">
          <button
            onClick={() => router.push('/signup')}
            className="w-full px-8 py-3 bg-blue-600 text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-semibold text-lg"
          >
            Start Now
          </button>
          
          <div className="mt-6">
            <div className="text-sm text-gray-500 mb-2">
              Already have an account?
            </div>
            <button
              onClick={() => router.push('/signin')}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
