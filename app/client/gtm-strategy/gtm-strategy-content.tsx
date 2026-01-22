'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Target, Loader2, Users, Briefcase, Building2, Layers, BookOpen, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

interface GTMStrategyData {
  workspace: {
    workspace_oid: string;
    company_name: string;
  };
  personas: Array<{
    oId: string;
    name: string;
    internalName?: string;
    description?: string;
  }>;
  useCases: Array<{
    oId: string;
    name: string;
    internalName?: string;
    description?: string;
  }>;
  clientReferences: Array<{
    oId: string;
    name: string;
    companyName?: string;
    companyDomain?: string;
    industry?: string;
  }>;
  segments: Array<{
    oId: string;
    name: string;
    description?: string;
  }>;
  playbooks: Array<{
    oId: string;
    name: string;
    description?: string;
  }>;
  serviceOffering: {
    oId: string;
    name: string;
    description?: string;
    data?: any;
  } | null;
}

export default function GTMStrategyPageContent() {
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GTMStrategyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait a bit for auth to initialize, then load data
    const timer = setTimeout(() => {
      loadGTMStrategyData();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [impersonateUserId]);

  const loadGTMStrategyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // First check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ User not authenticated:', userError?.message);
        throw new Error('Authentication required. Please sign in again.');
      }

      // Get session token for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      console.log('🔐 Frontend auth check:', {
        hasUser: !!user,
        userId: user?.id,
        hasSession: !!session,
        hasToken: !!authToken,
        tokenLength: authToken?.length || 0,
        sessionError: sessionError?.message,
        impersonateUserId: impersonateUserId || 'none'
      });

      if (!authToken) {
        console.error('❌ No auth token available, trying to refresh session...');
        // Try to refresh the session
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedSession?.access_token) {
          console.error('❌ Failed to refresh session:', refreshError?.message);
          throw new Error('Authentication required. Please sign in again.');
        }
        const refreshedToken = refreshedSession.access_token;
        console.log('✅ Session refreshed, token length:', refreshedToken?.length || 0);
        
        const url = impersonateUserId
          ? `/api/client/gtm-strategy?impersonate=${impersonateUserId}`
          : '/api/client/gtm-strategy';

        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${refreshedToken}`
          }
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || result.details || 'Failed to load GTM Strategy data');
        }
        setData(result);
        return;
      }

      const url = impersonateUserId
        ? `/api/client/gtm-strategy?impersonate=${impersonateUserId}`
        : '/api/client/gtm-strategy';

      console.log('📤 Fetching GTM Strategy:', { url, hasAuthToken: !!authToken, tokenLength: authToken.length });

      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      console.log('📥 GTM Strategy response:', { 
        ok: response.ok, 
        status: response.status,
        statusText: response.statusText 
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('❌ GTM Strategy error:', result);
        throw new Error(result.error || result.details || 'Failed to load GTM Strategy data');
      }

      setData(result);
    } catch (err: any) {
      console.error('❌ Error loading GTM Strategy data:', err);
      setError(err.message || 'Failed to load GTM Strategy data');
      toast.error(err.message || 'Failed to load GTM Strategy data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-fo-primary animate-spin mx-auto mb-4" strokeWidth={2} />
          <p className="text-fo-text-secondary">Loading GTM Strategy data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-red-500" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-fo-dark mb-4">Error Loading GTM Strategy</h1>
          <p className="text-fo-text-secondary mb-6">{error || 'Unknown error occurred'}</p>
          <button
            onClick={loadGTMStrategyData}
            className="px-6 py-3 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-6 h-6 text-fo-primary" strokeWidth={2} />
          <h1 className="text-2xl font-bold text-fo-dark">GTM Strategy</h1>
        </div>
        <p className="text-fo-text-secondary">
          View your Octave workspace elements. This is a read-only view of your go-to-market strategy configuration.
        </p>
      </div>

      {/* Service Offering */}
      {data.serviceOffering && (
        <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-5 h-5 text-fo-primary" strokeWidth={2} />
            <h2 className="text-xl font-semibold text-fo-dark">Service Offering</h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-fo-text-secondary mb-1">Name</p>
              <p className="text-fo-dark font-medium">{data.serviceOffering.name}</p>
            </div>
            {data.serviceOffering.description && (
              <div>
                <p className="text-sm font-semibold text-fo-text-secondary mb-1">Description</p>
                <p className="text-fo-text-secondary">{data.serviceOffering.description}</p>
              </div>
            )}
            {data.serviceOffering.data && (
              <div>
                <p className="text-sm font-semibold text-fo-text-secondary mb-1">Details</p>
                <pre className="bg-fo-bg-light p-4 rounded-lg text-sm text-fo-text-secondary overflow-x-auto">
                  {JSON.stringify(data.serviceOffering.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Personas */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-fo-primary" strokeWidth={2} />
          <h2 className="text-xl font-semibold text-fo-dark">Personas ({data.personas.length})</h2>
        </div>
        {data.personas.length === 0 ? (
          <p className="text-fo-text-secondary">No personas configured</p>
        ) : (
          <div className="space-y-4">
            {data.personas.map((persona) => (
              <div key={persona.oId} className="border border-fo-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-fo-dark">{persona.name}</p>
                    {persona.internalName && (
                      <p className="text-sm text-fo-text-secondary">Internal: {persona.internalName}</p>
                    )}
                  </div>
                </div>
                {persona.description && (
                  <p className="text-sm text-fo-text-secondary mt-2">{persona.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Use Cases */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Briefcase className="w-5 h-5 text-fo-primary" strokeWidth={2} />
          <h2 className="text-xl font-semibold text-fo-dark">Use Cases ({data.useCases.length})</h2>
        </div>
        {data.useCases.length === 0 ? (
          <p className="text-fo-text-secondary">No use cases configured</p>
        ) : (
          <div className="space-y-4">
            {data.useCases.map((useCase) => (
              <div key={useCase.oId} className="border border-fo-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-fo-dark">{useCase.name}</p>
                    {useCase.internalName && (
                      <p className="text-sm text-fo-text-secondary">Internal: {useCase.internalName}</p>
                    )}
                  </div>
                </div>
                {useCase.description && (
                  <p className="text-sm text-fo-text-secondary mt-2">{useCase.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Client References */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="w-5 h-5 text-fo-primary" strokeWidth={2} />
          <h2 className="text-xl font-semibold text-fo-dark">Client References ({data.clientReferences.length})</h2>
        </div>
        {data.clientReferences.length === 0 ? (
          <p className="text-fo-text-secondary">No client references configured</p>
        ) : (
          <div className="space-y-4">
            {data.clientReferences.map((ref) => (
              <div key={ref.oId} className="border border-fo-border rounded-lg p-4">
                <p className="font-semibold text-fo-dark">{ref.name}</p>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-fo-text-secondary">
                  {ref.companyName && <span>Company: {ref.companyName}</span>}
                  {ref.companyDomain && <span>Domain: {ref.companyDomain}</span>}
                  {ref.industry && <span>Industry: {ref.industry}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Segments */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Layers className="w-5 h-5 text-fo-primary" strokeWidth={2} />
          <h2 className="text-xl font-semibold text-fo-dark">Segments ({data.segments.length})</h2>
        </div>
        {data.segments.length === 0 ? (
          <p className="text-fo-text-secondary">No segments configured</p>
        ) : (
          <div className="space-y-4">
            {data.segments.map((segment) => (
              <div key={segment.oId} className="border border-fo-border rounded-lg p-4">
                <p className="font-semibold text-fo-dark">{segment.name}</p>
                {segment.description && (
                  <p className="text-sm text-fo-text-secondary mt-2">{segment.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Playbooks */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-5 h-5 text-fo-primary" strokeWidth={2} />
          <h2 className="text-xl font-semibold text-fo-dark">Playbooks ({data.playbooks.length})</h2>
        </div>
        {data.playbooks.length === 0 ? (
          <p className="text-fo-text-secondary">No playbooks configured</p>
        ) : (
          <div className="space-y-4">
            {data.playbooks.map((playbook) => (
              <div key={playbook.oId} className="border border-fo-border rounded-lg p-4">
                <p className="font-semibold text-fo-dark">{playbook.name}</p>
                {playbook.description && (
                  <p className="text-sm text-fo-text-secondary mt-2">{playbook.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

