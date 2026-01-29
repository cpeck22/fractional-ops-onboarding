'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ApprovalsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Redirect to unified Campaign Status Hub
    // Preserve filters and impersonate param
    const status = searchParams.get('status') || 'pending_approval';
    const category = searchParams.get('category');
    const impersonate = searchParams.get('impersonate');
    
    const params = new URLSearchParams();
    params.set('status', status);
    if (category) params.set('category', category);
    if (impersonate) params.set('impersonate', impersonate);
    
    router.replace(`/client/outbound-campaigns?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fo-primary mx-auto mb-4"></div>
        <p className="text-fo-text-secondary">Redirecting to Campaign Status Hub...</p>
      </div>
    </div>
  );
}
