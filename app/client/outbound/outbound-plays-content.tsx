'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { addImpersonateParam } from '@/lib/client-api-helpers';

interface Play {
  code: string;
  name: string;
  category: string;
  documentation_status: string;
  content_agent_status: string;
  is_active: boolean;
}

export default function OutboundPlaysPageContent() {
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const [plays, setPlays] = useState<Play[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPlays = useCallback(async () => {
    try {
      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam('/api/client/plays?category=outbound', impersonateUserId);
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setPlays(data.plays);
      } else {
        toast.error('Failed to load plays');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading plays:', error);
      toast.error('Failed to load plays');
      setLoading(false);
    }
  }, [impersonateUserId]);

  useEffect(() => {
    loadPlays();
  }, [loadPlays]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fo-primary mx-auto mb-4"></div>
          <p className="text-fo-text-secondary">Loading plays...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-fo-dark mb-2">Outbound Plays</h1>
        <p className="text-fo-text-secondary">Custom campaign playbooks that combine strategic library items</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plays.map((play) => {
          const isDisabled = play.documentation_status === 'Blocked' || 
                           (play.content_agent_status === 'Not Required' && play.documentation_status !== 'Completed');
          
          return (
            <Link
              key={play.code}
              href={isDisabled ? '#' : `/client/outbound/${play.code}`}
              className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all ${
                isDisabled
                  ? 'border-fo-light opacity-60 cursor-not-allowed'
                  : 'border-fo-light hover:border-fo-primary hover:shadow-lg cursor-pointer'
              }`}
              onClick={(e) => {
                if (isDisabled) {
                  e.preventDefault();
                  toast.error('This play is not yet available');
                }
              }}
            >
              <div className="flex items-start mb-3">
                <span className="text-sm font-mono font-bold text-fo-primary bg-fo-primary/10 px-2 py-1 rounded">
                  {play.code}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-fo-dark mb-2">
                {play.name}
              </h3>
              
              {isDisabled && (
                <p className="text-xs text-fo-text-secondary mt-2">
                  ⚠️ This play is currently unavailable
                </p>
              )}
            </Link>
          );
        })}
      </div>

      {plays.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-fo-text-secondary text-lg">No outbound plays available</p>
        </div>
      )}
    </div>
  );
}

