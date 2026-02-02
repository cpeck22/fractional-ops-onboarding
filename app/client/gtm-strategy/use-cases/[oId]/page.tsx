'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Briefcase, Loader2, ArrowLeft, Edit, Save, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface UseCaseData {
  oId: string;
  name: string;
  internalName?: string;
  description?: string;
  primaryUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  active?: boolean;
  data?: {
    summary?: string;
    scenarios?: string[];
    desiredOutcomes?: string[];
    businessDrivers?: string[];
    businessImpact?: string[];
    customFields?: Array<{ title: string; value: string[] }>;
  };
  scenarios?: string[];
  desiredOutcomes?: string[];
  user?: any;
  workspace?: any;
}

function UseCaseDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const useCaseOId = params.oId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [useCase, setUseCase] = useState<UseCaseData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    internalName: '',
    description: '',
    primaryUrl: '',
    summary: '',
    scenarios: [] as string[],
    desiredOutcomes: [] as string[],
    businessDrivers: [] as string[],
    businessImpact: [] as string[]
  });

  useEffect(() => {
    loadUseCase();
  }, [useCaseOId, impersonateUserId]);

  const loadUseCase = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Authentication required');

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      if (!authToken) throw new Error('No auth token available');

      const url = impersonateUserId
        ? `/api/client/gtm-strategy?impersonate=${impersonateUserId}`
        : '/api/client/gtm-strategy';

      const response = await fetch(url, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!response.ok) throw new Error('Failed to load use case data');

      const result = await response.json();
      const foundUseCase = result.useCases?.find((uc: UseCaseData) => uc.oId === useCaseOId);

      if (!foundUseCase) throw new Error('Use case not found');

      setUseCase(foundUseCase);
      setFormData({
        name: foundUseCase.name || '',
        internalName: foundUseCase.internalName || '',
        description: foundUseCase.description || '',
        primaryUrl: foundUseCase.primaryUrl || '',
        summary: foundUseCase.data?.summary || '',
        scenarios: foundUseCase.data?.scenarios || foundUseCase.scenarios || [],
        desiredOutcomes: foundUseCase.data?.desiredOutcomes || foundUseCase.desiredOutcomes || [],
        businessDrivers: foundUseCase.data?.businessDrivers || [],
        businessImpact: foundUseCase.data?.businessImpact || []
      });

    } catch (err: any) {
      console.error('Error loading use case:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!formData.name.trim()) {
        toast.error('Use case name is required');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      if (!authToken) throw new Error('Authentication required');

      const url = impersonateUserId
        ? `/api/client/gtm-strategy/use-cases?impersonate=${impersonateUserId}`
        : '/api/client/gtm-strategy/use-cases';

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ oId: useCaseOId, ...formData })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save use case');
      }

      toast.success('Use case updated successfully');
      setIsEditing(false);
      await loadUseCase();

    } catch (err: any) {
      console.error('Error saving use case:', err);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (useCase) {
      setFormData({
        name: useCase.name || '',
        internalName: useCase.internalName || '',
        description: useCase.description || '',
        primaryUrl: useCase.primaryUrl || '',
        summary: useCase.data?.summary || '',
        scenarios: useCase.data?.scenarios || useCase.scenarios || [],
        desiredOutcomes: useCase.data?.desiredOutcomes || useCase.desiredOutcomes || [],
        businessDrivers: useCase.data?.businessDrivers || [],
        businessImpact: useCase.data?.businessImpact || []
      });
    }
    setIsEditing(false);
  };

  const handleArrayFieldChange = (field: string, index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).map((item, i) => 
        i === index ? value : item
      )
    }));
  };

  const handleAddArrayItem = (field: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field as keyof typeof prev] as string[]), '']
    }));
  };

  const handleRemoveArrayItem = (field: string, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-fo-primary animate-spin mx-auto mb-4" strokeWidth={2} />
          <p className="text-fo-text-secondary">Loading use case details...</p>
        </div>
      </div>
    );
  }

  if (error || !useCase) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-fo-dark mb-4">Error Loading Use Case</h1>
          <p className="text-fo-text-secondary mb-6">{error || 'Use case not found'}</p>
          <button onClick={() => router.back()} className="px-6 py-3 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const renderArrayField = (title: string, field: keyof typeof formData, placeholder: string, data?: string[]) => (
    <div>
      <h2 className="text-lg font-semibold text-fo-dark mb-4">{title}</h2>
      {isEditing ? (
        <div className="space-y-2">
          {(formData[field] as string[]).map((item, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => handleArrayFieldChange(field as string, index, e.target.value)}
                className="flex-1 px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
                placeholder={placeholder}
              />
              <button onClick={() => handleRemoveArrayItem(field as string, index)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                Remove
              </button>
            </div>
          ))}
          <button onClick={() => handleAddArrayItem(field as string)} className="px-4 py-2 text-fo-primary border border-fo-primary rounded-lg hover:bg-fo-light transition-colors">
            + Add {title.slice(0, -1)}
          </button>
        </div>
      ) : data && data.length > 0 ? (
        <ul className="list-disc list-inside space-y-2 bg-fo-bg-light p-4 rounded-lg">
          {data.map((item, idx) => (
            <li key={idx} className="text-fo-dark">{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-fo-text-secondary italic">No {title.toLowerCase()} listed</p>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-fo-bg-light rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-fo-text-secondary" strokeWidth={2} />
            </button>
            <div className="flex items-center gap-3">
              <Briefcase className="w-6 h-6 text-fo-primary" strokeWidth={2} />
              <div>
                <h1 className="text-2xl font-bold text-fo-dark">{useCase.name}</h1>
                {useCase.internalName && <p className="text-sm text-fo-text-secondary">Internal: {useCase.internalName}</p>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <button onClick={handleCancel} disabled={saving} className="flex items-center gap-2 px-4 py-2 border border-fo-border rounded-lg hover:bg-fo-bg-light font-semibold transition-colors disabled:opacity-50">
                  <X className="w-4 h-4" strokeWidth={2} />
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold transition-colors disabled:opacity-50">
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" strokeWidth={2} />
                      Save Changes
                    </>
                  )}
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold">
                <Edit className="w-4 h-4" strokeWidth={2} />
                Edit Use Case
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Use Case Details */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Name</label>
              {isEditing ? (
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Use case name" />
              ) : (
                <p className="text-fo-dark font-medium">{useCase.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Internal Name</label>
              {isEditing ? (
                <input type="text" value={formData.internalName} onChange={(e) => setFormData({ ...formData, internalName: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Internal name (optional)" />
              ) : useCase.internalName ? (
                <p className="text-fo-dark">{useCase.internalName}</p>
              ) : (
                <p className="text-fo-text-secondary italic">Not specified</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Description</label>
              {isEditing ? (
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Brief description" />
              ) : useCase.description ? (
                <p className="text-fo-dark">{useCase.description}</p>
              ) : (
                <p className="text-fo-text-secondary italic">No description</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Primary URL</label>
              {isEditing ? (
                <input type="url" value={formData.primaryUrl} onChange={(e) => setFormData({ ...formData, primaryUrl: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="https://example.com/use-case" />
              ) : useCase.primaryUrl ? (
                <a href={useCase.primaryUrl} target="_blank" rel="noopener noreferrer" className="text-fo-primary hover:underline">{useCase.primaryUrl}</a>
              ) : (
                <p className="text-fo-text-secondary italic">No URL specified</p>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Summary</h2>
          {isEditing ? (
            <textarea value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} rows={4} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Detailed summary of the use case" />
          ) : useCase.data?.summary ? (
            <p className="text-fo-dark bg-fo-bg-light p-4 rounded-lg">{useCase.data.summary}</p>
          ) : (
            <p className="text-fo-text-secondary italic">No summary available</p>
          )}
        </div>

        {renderArrayField('Scenarios', 'scenarios', 'Scenario', useCase.data?.scenarios || useCase.scenarios)}
        {renderArrayField('Desired Outcomes', 'desiredOutcomes', 'Desired outcome', useCase.data?.desiredOutcomes || useCase.desiredOutcomes)}
        {renderArrayField('Business Drivers', 'businessDrivers', 'Business driver', useCase.data?.businessDrivers)}
        {renderArrayField('Business Impact', 'businessImpact', 'Business impact', useCase.data?.businessImpact)}

        {/* Metadata */}
        <div className="border-t border-fo-border pt-6">
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Metadata</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {useCase.createdAt && (
              <div>
                <p className="text-fo-text-secondary">Created</p>
                <p className="text-fo-dark font-medium">{new Date(useCase.createdAt).toLocaleDateString()}</p>
              </div>
            )}
            {useCase.updatedAt && (
              <div>
                <p className="text-fo-text-secondary">Last Updated</p>
                <p className="text-fo-dark font-medium">{new Date(useCase.updatedAt).toLocaleDateString()}</p>
              </div>
            )}
            <div>
              <p className="text-fo-text-secondary">Status</p>
              <p className={`font-medium ${useCase.active ? 'text-green-600' : 'text-gray-500'}`}>
                {useCase.active ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div>
              <p className="text-fo-text-secondary">Use Case ID</p>
              <p className="text-fo-dark font-mono text-xs">{useCase.oId}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UseCaseDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-fo-primary animate-spin" strokeWidth={2} />
      </div>
    }>
      <UseCaseDetailContent />
    </Suspense>
  );
}
