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
    <main className="min-h-screen flex items-center justify-center px-4 bg-fo-bg-light py-12">
      <div className="max-w-2xl w-full space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-fo-border p-8">
          <div className="text-center mb-6">
            <div className="inline-block relative mb-4">
              <span className="absolute -top-2 -right-8 bg-fo-primary text-white text-xs font-bold px-2 py-1 rounded">
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
          <div className="mb-6">
            <h2 className="text-xl font-bold text-fo-primary mb-4 text-center">
              👇 Watch this first!
            </h2>
            <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-md relative">
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
              className="w-full px-8 py-3 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fo-primary font-semibold text-lg shadow-md hover:shadow-lg transition-all"
            >
              Start Now
            </button>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => router.push('/signin')}
                className="text-sm text-fo-text-secondary hover:text-fo-primary transition-colors"
              >
                Already have an account? Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
