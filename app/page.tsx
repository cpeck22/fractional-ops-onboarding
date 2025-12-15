'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getCurrentUser, supabase } from '@/lib/supabase';
import Logo from './Fractional-Ops_Symbol_Main.png';

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-100 py-12">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <div className="inline-block relative mb-4">
            <span className="absolute -top-2 -right-8 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
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
        </div>

        {/* Claire's Greeting Video */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-blue-600 mb-4 text-center">
            👇 Watch this first!
          </h2>
          <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg overflow-hidden shadow-md relative">
            <iframe
              src="https://drive.google.com/file/d/12e2_ABddNtMe3CcH-rssjR45BSpRTMRE/preview"
              className="w-full h-full"
              allow="autoplay"
              allowFullScreen
              style={{ border: 'none' }}
            />
            {/* Overlay to block download button in top-right corner */}
            <div 
              className="absolute top-0 right-0 w-16 h-16 bg-transparent z-10"
              onClick={(e) => e.preventDefault()}
            />
          </div>
        </div>
        
        <div className="text-left">
          <button
            onClick={() => router.push('/signup')}
            className="w-full px-8 py-3 bg-blue-600 text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-semibold text-lg"
          >
            Start Now
          </button>
          
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/signin')}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Already have an account? Sign In
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
