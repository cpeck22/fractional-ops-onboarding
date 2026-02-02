'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Target, Loader2, Users, Briefcase, Building2, Layers, BookOpen, Package, Swords, Award, Eye, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

interface GTMStrategyData {
  workspace: {
    workspace_oid: string;
    company_name: string;
    workspace_api_key?: string;
  };
  personas: Array<{
    oId: string;
    name: string;
    internalName?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    active?: boolean;
    data?: any;
    qualifyingQuestions?: any[];
    user?: any;
    workspace?: any;
  }>;
  useCases: Array<{
    oId: string;
    name: string;
    internalName?: string;
    description?: string;
    primaryUrl?: string;
    createdAt?: string;
    updatedAt?: string;
    active?: boolean;
    data?: any;
    scenarios?: string[];
    desiredOutcomes?: string[];
    user?: any;
    workspace?: any;
  }>;
  clientReferences: Array<{
    oId: string;
    name: string;
    internalName?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    active?: boolean;
    data?: any;
    user?: any;
    workspace?: any;
    unrecognized?: boolean;
  }>;
  segments: Array<{
    oId: string;
    name: string;
    internalName?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    active?: boolean;
    data?: any;
    qualifyingQuestions?: any[];
    user?: any;
    workspace?: any;
    unrecognized?: boolean;
    rejected?: boolean;
  }>;
  playbooks: Array<{
    oId: string;
    name: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    active?: boolean;
    shared?: boolean;
    type?: string;
    framework?: string;
    status?: string;
    referenceMode?: string;
    proofPointMode?: string;
    data?: any;
    qualifyingQuestions?: any[];
    user?: any;
    workspace?: any;
    product?: any;
    buyerPersonas?: any[];
    useCases?: any[];
    references?: any[];
    segment?: any;
    competitor?: any;
    proofPoints?: any[];
  }>;
  competitors: Array<{
    oId: string;
    name: string;
    internalName?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    active?: boolean;
    shared?: boolean;
    data?: any;
    user?: any;
    workspace?: any;
  }>;
  proofPoints: Array<{
    oId: string;
    name: string;
    internalName?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    active?: boolean;
    data?: any;
    user?: any;
    workspace?: any;
  }>;
  services: Array<{
    oId: string;
    name: string;
    internalName?: string;
    description?: string;
    primaryUrl?: string;
    createdAt?: string;
    updatedAt?: string;
    active?: boolean;
    data?: any;
    qualifyingQuestions?: any[];
    user?: any;
    workspace?: any;
  }>;
}

export default function GTMStrategyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GTMStrategyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadGTMStrategyData = useCallback(async () => {
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
  }, [impersonateUserId]);

  useEffect(() => {
    // Wait for auth to initialize, then load data
    const initializeAndLoad = async () => {
      // First verify user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ User not authenticated in useEffect:', userError?.message);
        setError('Authentication required. Please sign in again.');
        setLoading(false);
        return;
      }
      
      // Small delay to ensure session is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      loadGTMStrategyData();
    };
    
    initializeAndLoad();
  }, [impersonateUserId, loadGTMStrategyData]);

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

  const MAX_SERVICES = 3;
  const serviceCount = data.services?.length || 0;
  const canAddService = serviceCount < MAX_SERVICES;

  const handleViewDetails = (entityType: string, oId: string) => {
    const url = impersonateUserId
      ? `/client/gtm-strategy/${entityType}/${oId}?impersonate=${impersonateUserId}`
      : `/client/gtm-strategy/${entityType}/${oId}`;
    router.push(url);
  };

  const handleAddService = () => {
    if (!canAddService) {
      toast.error(`Maximum ${MAX_SERVICES} services allowed`);
      return;
    }
    const url = impersonateUserId
      ? `/client/gtm-strategy/services/new?impersonate=${impersonateUserId}`
      : `/client/gtm-strategy/services/new`;
    router.push(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-6 h-6 text-fo-primary" strokeWidth={2} />
          <h1 className="text-2xl font-bold text-fo-dark">GTM Strategy</h1>
        </div>
        <p className="text-fo-text-secondary">
          View and manage your Octave workspace elements. Click on any item to view full details and edit.
        </p>
      </div>

      {/* Services Section */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-fo-primary" strokeWidth={2} />
            <h2 className="text-xl font-semibold text-fo-dark">Services</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              serviceCount >= MAX_SERVICES 
                ? 'bg-fo-primary text-white' 
                : 'bg-fo-bg-light text-fo-text-secondary'
            }`}>
              {serviceCount}/{MAX_SERVICES}
            </span>
          </div>
          <button
            onClick={handleAddService}
            disabled={!canAddService}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              canAddService
                ? 'bg-fo-primary text-white hover:bg-fo-primary/90'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add Service
          </button>
        </div>
        
        {data.services.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-fo-text-secondary mx-auto mb-3 opacity-50" strokeWidth={1.5} />
            <p className="text-fo-text-secondary mb-4">No services configured yet</p>
            <button
              onClick={handleAddService}
              className="px-6 py-3 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold"
            >
              Add Your First Service
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.services.map((service) => (
              <div 
                key={service.oId} 
                className="border border-fo-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-fo-dark mb-2 line-clamp-1">{service.name}</h3>
                {service.description && (
                  <p className="text-sm text-fo-text-secondary mb-3 line-clamp-2">{service.description}</p>
                )}
                <button
                  onClick={() => handleViewDetails('services', service.oId)}
                  className="flex items-center gap-2 text-sm text-fo-primary hover:text-fo-primary/80 font-semibold"
                >
                  <Eye className="w-4 h-4" strokeWidth={2} />
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Personas */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-fo-primary" strokeWidth={2} />
            <h2 className="text-xl font-semibold text-fo-dark">Personas</h2>
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-fo-bg-light text-fo-text-secondary">
              {data.personas.length}
            </span>
          </div>
          <button
            onClick={() => {
              const url = impersonateUserId 
                ? `/client/gtm-strategy/personas/new?impersonate=${impersonateUserId}`
                : `/client/gtm-strategy/personas/new`;
              router.push(url);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add Persona
          </button>
        </div>
        
        {data.personas.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-fo-text-secondary mx-auto mb-3 opacity-50" strokeWidth={1.5} />
            <p className="text-fo-text-secondary">No personas configured yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.personas.map((persona) => (
              <div 
                key={persona.oId} 
                className="border border-fo-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-fo-dark mb-2 line-clamp-1">{persona.name}</h3>
                {persona.description && (
                  <p className="text-sm text-fo-text-secondary mb-3 line-clamp-2">{persona.description}</p>
                )}
                <button
                  onClick={() => handleViewDetails('personas', persona.oId)}
                  className="flex items-center gap-2 text-sm text-fo-primary hover:text-fo-primary/80 font-semibold"
                >
                  <Eye className="w-4 h-4" strokeWidth={2} />
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Use Cases */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-fo-primary" strokeWidth={2} />
            <h2 className="text-xl font-semibold text-fo-dark">Use Cases</h2>
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-fo-bg-light text-fo-text-secondary">
              {data.useCases.length}
            </span>
          </div>
          <button
            onClick={() => {
              const url = impersonateUserId 
                ? `/client/gtm-strategy/use-cases/new?impersonate=${impersonateUserId}`
                : `/client/gtm-strategy/use-cases/new`;
              router.push(url);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add Use Case
          </button>
        </div>
        
        {data.useCases.length === 0 ? (
          <div className="text-center py-8">
            <Briefcase className="w-12 h-12 text-fo-text-secondary mx-auto mb-3 opacity-50" strokeWidth={1.5} />
            <p className="text-fo-text-secondary">No use cases configured yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.useCases.map((useCase) => (
              <div 
                key={useCase.oId} 
                className="border border-fo-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-fo-dark mb-2 line-clamp-1">{useCase.name}</h3>
                {useCase.description && (
                  <p className="text-sm text-fo-text-secondary mb-3 line-clamp-2">{useCase.description}</p>
                )}
                <button
                  onClick={() => handleViewDetails('use-cases', useCase.oId)}
                  className="flex items-center gap-2 text-sm text-fo-primary hover:text-fo-primary/80 font-semibold"
                >
                  <Eye className="w-4 h-4" strokeWidth={2} />
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Client References */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-fo-primary" strokeWidth={2} />
            <h2 className="text-xl font-semibold text-fo-dark">Client References</h2>
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-fo-bg-light text-fo-text-secondary">
              {data.clientReferences.length}
            </span>
          </div>
          <button
            onClick={() => {
              const url = impersonateUserId 
                ? `/client/gtm-strategy/references/new?impersonate=${impersonateUserId}`
                : `/client/gtm-strategy/references/new`;
              router.push(url);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add Reference
          </button>
        </div>
        
        {data.clientReferences.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 text-fo-text-secondary mx-auto mb-3 opacity-50" strokeWidth={1.5} />
            <p className="text-fo-text-secondary">No client references configured yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.clientReferences.map((ref) => (
              <div 
                key={ref.oId} 
                className="border border-fo-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-fo-dark mb-2 line-clamp-1">{ref.name}</h3>
                {ref.description && (
                  <p className="text-sm text-fo-text-secondary mb-3 line-clamp-2">{ref.description}</p>
                )}
                <button
                  onClick={() => handleViewDetails('references', ref.oId)}
                  className="flex items-center gap-2 text-sm text-fo-primary hover:text-fo-primary/80 font-semibold"
                >
                  <Eye className="w-4 h-4" strokeWidth={2} />
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Segments */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-fo-primary" strokeWidth={2} />
            <h2 className="text-xl font-semibold text-fo-dark">Segments</h2>
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-fo-bg-light text-fo-text-secondary">
              {data.segments.length}
            </span>
          </div>
          <button
            onClick={() => {
              const url = impersonateUserId 
                ? `/client/gtm-strategy/segments/new?impersonate=${impersonateUserId}`
                : `/client/gtm-strategy/segments/new`;
              router.push(url);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add Segment
          </button>
        </div>
        
        {data.segments.length === 0 ? (
          <div className="text-center py-8">
            <Layers className="w-12 h-12 text-fo-text-secondary mx-auto mb-3 opacity-50" strokeWidth={1.5} />
            <p className="text-fo-text-secondary">No segments configured yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.segments.map((segment) => (
              <div 
                key={segment.oId} 
                className="border border-fo-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-fo-dark mb-2 line-clamp-1">{segment.name}</h3>
                {segment.description && (
                  <p className="text-sm text-fo-text-secondary mb-3 line-clamp-2">{segment.description}</p>
                )}
                <button
                  onClick={() => handleViewDetails('segments', segment.oId)}
                  className="flex items-center gap-2 text-sm text-fo-primary hover:text-fo-primary/80 font-semibold"
                >
                  <Eye className="w-4 h-4" strokeWidth={2} />
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Playbooks */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-fo-primary" strokeWidth={2} />
            <h2 className="text-xl font-semibold text-fo-dark">Playbooks</h2>
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-fo-bg-light text-fo-text-secondary">
              {data.playbooks.length}
            </span>
          </div>
          <button
            onClick={() => {
              const url = impersonateUserId 
                ? `/client/gtm-strategy/playbooks/new?impersonate=${impersonateUserId}`
                : `/client/gtm-strategy/playbooks/new`;
              router.push(url);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add Playbook
          </button>
        </div>
        
        {data.playbooks.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 text-fo-text-secondary mx-auto mb-3 opacity-50" strokeWidth={1.5} />
            <p className="text-fo-text-secondary">No playbooks configured yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.playbooks.map((playbook) => (
              <div 
                key={playbook.oId} 
                className="border border-fo-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-fo-dark mb-2 line-clamp-1">{playbook.name}</h3>
                {playbook.description && (
                  <p className="text-sm text-fo-text-secondary mb-3 line-clamp-2">{playbook.description}</p>
                )}
                <button
                  onClick={() => handleViewDetails('playbooks', playbook.oId)}
                  className="flex items-center gap-2 text-sm text-fo-primary hover:text-fo-primary/80 font-semibold"
                >
                  <Eye className="w-4 h-4" strokeWidth={2} />
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Competitors */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Swords className="w-5 h-5 text-fo-primary" strokeWidth={2} />
            <h2 className="text-xl font-semibold text-fo-dark">Competitors</h2>
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-fo-bg-light text-fo-text-secondary">
              {data.competitors.length}
            </span>
          </div>
          <button
            onClick={() => {
              const url = impersonateUserId 
                ? `/client/gtm-strategy/competitors/new?impersonate=${impersonateUserId}`
                : `/client/gtm-strategy/competitors/new`;
              router.push(url);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add Competitor
          </button>
        </div>
        
        {data.competitors.length === 0 ? (
          <div className="text-center py-8">
            <Swords className="w-12 h-12 text-fo-text-secondary mx-auto mb-3 opacity-50" strokeWidth={1.5} />
            <p className="text-fo-text-secondary">No competitors configured yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.competitors.map((competitor) => (
              <div 
                key={competitor.oId} 
                className="border border-fo-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-fo-dark mb-2 line-clamp-1">{competitor.name}</h3>
                {competitor.description && (
                  <p className="text-sm text-fo-text-secondary mb-3 line-clamp-2">{competitor.description}</p>
                )}
                <button
                  onClick={() => handleViewDetails('competitors', competitor.oId)}
                  className="flex items-center gap-2 text-sm text-fo-primary hover:text-fo-primary/80 font-semibold"
                >
                  <Eye className="w-4 h-4" strokeWidth={2} />
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Proof Points */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Award className="w-5 h-5 text-fo-primary" strokeWidth={2} />
            <h2 className="text-xl font-semibold text-fo-dark">Proof Points</h2>
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-fo-bg-light text-fo-text-secondary">
              {data.proofPoints.length}
            </span>
          </div>
          <button
            onClick={() => {
              const url = impersonateUserId 
                ? `/client/gtm-strategy/proof-points/new?impersonate=${impersonateUserId}`
                : `/client/gtm-strategy/proof-points/new`;
              router.push(url);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add Proof Point
          </button>
        </div>
        
        {data.proofPoints.length === 0 ? (
          <div className="text-center py-8">
            <Award className="w-12 h-12 text-fo-text-secondary mx-auto mb-3 opacity-50" strokeWidth={1.5} />
            <p className="text-fo-text-secondary">No proof points configured yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.proofPoints.map((proofPoint) => (
              <div 
                key={proofPoint.oId} 
                className="border border-fo-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-fo-dark mb-2 line-clamp-1">{proofPoint.name}</h3>
                {proofPoint.description && (
                  <p className="text-sm text-fo-text-secondary mb-3 line-clamp-2">{proofPoint.description}</p>
                )}
                <button
                  onClick={() => handleViewDetails('proof-points', proofPoint.oId)}
                  className="flex items-center gap-2 text-sm text-fo-primary hover:text-fo-primary/80 font-semibold"
                >
                  <Eye className="w-4 h-4" strokeWidth={2} />
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

