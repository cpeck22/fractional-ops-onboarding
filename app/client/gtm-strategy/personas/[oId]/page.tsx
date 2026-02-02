'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Users, Loader2, ArrowLeft, Edit, Save, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import UnsavedChangesWarning from '@/components/UnsavedChangesWarning';

export const dynamic = 'force-dynamic';

interface PersonaData {
  oId: string;
  name: string;
  internalName?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  active?: boolean;
  data?: {
    internalName?: string;
    primaryResponsibilities?: string[];
    painPoints?: string[];
    keyConcerns?: string[];
    keyObjectives?: string[];
    commonJobTitles?: string[];
    whyTheyMatterToUs?: string[];
    whyWeMatterToThem?: string[];
    customFields?: Array<{ title: string; value: string[] }>;
  };
  qualifyingQuestions?: Array<{
    question: string;
    rationale: string;
    fitType: string;
    weight: string;
  }>;
  user?: any;
  workspace?: any;
}

function PersonaDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const personaOId = params.oId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [persona, setPersona] = useState<PersonaData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [formData, setFormData] = useState({
    name: '',
    internalName: '',
    description: '',
    primaryResponsibilities: [] as string[],
    painPoints: [] as string[],
    keyConcerns: [] as string[],
    keyObjectives: [] as string[],
    commonJobTitles: [] as string[],
    whyTheyMatterToUs: [] as string[],
    whyWeMatterToThem: [] as string[]
  });

  useEffect(() => {
    loadPersona();
  }, [personaOId, impersonateUserId]);

  const loadPersona = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication required');
      }

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      if (!authToken) {
        throw new Error('No auth token available');
      }

      const url = impersonateUserId
        ? `/api/client/gtm-strategy?impersonate=${impersonateUserId}`
        : '/api/client/gtm-strategy';

      const response = await fetch(url, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!response.ok) {
        throw new Error('Failed to load persona data');
      }

      const result = await response.json();
      const foundPersona = result.personas?.find((p: PersonaData) => p.oId === personaOId);

      if (!foundPersona) {
        throw new Error('Persona not found');
      }

      setPersona(foundPersona);
      
      setFormData({
        name: foundPersona.name || '',
        internalName: foundPersona.internalName || '',
        description: foundPersona.description || '',
        primaryResponsibilities: foundPersona.data?.primaryResponsibilities || [],
        painPoints: foundPersona.data?.painPoints || [],
        keyConcerns: foundPersona.data?.keyConcerns || [],
        keyObjectives: foundPersona.data?.keyObjectives || [],
        commonJobTitles: foundPersona.data?.commonJobTitles || [],
        whyTheyMatterToUs: foundPersona.data?.whyTheyMatterToUs || [],
        whyWeMatterToThem: foundPersona.data?.whyWeMatterToThem || []
      });

    } catch (err: any) {
      console.error('Error loading persona:', err);
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
        toast.error('Persona name is required');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      if (!authToken) {
        throw new Error('Authentication required');
      }

      const url = impersonateUserId
        ? `/api/client/gtm-strategy/personas?impersonate=${impersonateUserId}`
        : '/api/client/gtm-strategy/personas';

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          oId: personaOId,
          ...formData
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save persona');
      }

      toast.success('Persona updated successfully');
      setIsEditing(false);
      await loadPersona();

    } catch (err: any) {
      console.error('Error saving persona:', err);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (persona) {
      setFormData({
        name: persona.name || '',
        internalName: persona.internalName || '',
        description: persona.description || '',
        primaryResponsibilities: persona.data?.primaryResponsibilities || [],
        painPoints: persona.data?.painPoints || [],
        keyConcerns: persona.data?.keyConcerns || [],
        keyObjectives: persona.data?.keyObjectives || [],
        commonJobTitles: persona.data?.commonJobTitles || [],
        whyTheyMatterToUs: persona.data?.whyTheyMatterToUs || [],
        whyWeMatterToThem: persona.data?.whyWeMatterToThem || []
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
          <p className="text-fo-text-secondary">Loading persona details...</p>
        </div>
      </div>
    );
  }

  if (error || !persona) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-fo-dark mb-4">Error Loading Persona</h1>
          <p className="text-fo-text-secondary mb-6">{error || 'Persona not found'}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const renderArrayField = (
    title: string,
    field: keyof typeof formData,
    placeholder: string,
    data?: string[]
  ) => (
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
              <button
                onClick={() => handleRemoveArrayItem(field as string, index)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => handleAddArrayItem(field as string)}
            className="px-4 py-2 text-fo-primary border border-fo-primary rounded-lg hover:bg-fo-light transition-colors"
          >
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
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-fo-bg-light rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-fo-text-secondary" strokeWidth={2} />
            </button>
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-fo-primary" strokeWidth={2} />
              <div>
                <h1 className="text-2xl font-bold text-fo-dark">{persona.name}</h1>
                {persona.internalName && (
                  <p className="text-sm text-fo-text-secondary">Internal: {persona.internalName}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 border border-fo-border rounded-lg hover:bg-fo-bg-light font-semibold transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold transition-colors disabled:opacity-50"
                >
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
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold"
              >
                <Edit className="w-4 h-4" strokeWidth={2} />
                Edit Persona
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Persona Details */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
                  placeholder="Persona name (e.g., VP of Sales)"
                />
              ) : (
                <p className="text-fo-dark font-medium">{persona.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Internal Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.internalName}
                  onChange={(e) => setFormData({ ...formData, internalName: e.target.value })}
                  className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
                  placeholder="Internal name (optional)"
                />
              ) : persona.internalName ? (
                <p className="text-fo-dark">{persona.internalName}</p>
              ) : (
                <p className="text-fo-text-secondary italic">Not specified</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Description</label>
              {isEditing ? (
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
                  placeholder="Brief description of the persona"
                />
              ) : persona.description ? (
                <p className="text-fo-dark">{persona.description}</p>
              ) : (
                <p className="text-fo-text-secondary italic">No description</p>
              )}
            </div>
          </div>
        </div>

        {/* Array Fields */}
        {renderArrayField(
          'Common Job Titles',
          'commonJobTitles',
          'Job title (e.g., VP of Sales)',
          persona.data?.commonJobTitles
        )}

        {renderArrayField(
          'Primary Responsibilities',
          'primaryResponsibilities',
          'Responsibility',
          persona.data?.primaryResponsibilities
        )}

        {renderArrayField(
          'Pain Points',
          'painPoints',
          'Pain point',
          persona.data?.painPoints
        )}

        {renderArrayField(
          'Key Concerns',
          'keyConcerns',
          'Concern',
          persona.data?.keyConcerns
        )}

        {renderArrayField(
          'Key Objectives',
          'keyObjectives',
          'Objective',
          persona.data?.keyObjectives
        )}

        {renderArrayField(
          'Why They Matter to Us',
          'whyTheyMatterToUs',
          'Reason they matter',
          persona.data?.whyTheyMatterToUs
        )}

        {renderArrayField(
          'Why We Matter to Them',
          'whyWeMatterToThem',
          'Reason we matter',
          persona.data?.whyWeMatterToThem
        )}

        {/* Qualifying Questions */}
        {persona.qualifyingQuestions && persona.qualifyingQuestions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-fo-dark mb-4">Qualifying Questions</h2>
            <div className="space-y-4">
              {persona.qualifyingQuestions.map((q, idx) => (
                <div key={idx} className="bg-fo-bg-light p-4 rounded-lg">
                  <p className="font-semibold text-fo-dark mb-2">{q.question}</p>
                  <p className="text-sm text-fo-text-secondary mb-2">Rationale: {q.rationale}</p>
                  <div className="flex gap-3 text-xs">
                    <span className={`px-2 py-1 rounded ${
                      q.fitType === 'GOOD' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {q.fitType}
                    </span>
                    <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">
                      {q.weight}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="border-t border-fo-border pt-6">
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Metadata</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {persona.createdAt && (
              <div>
                <p className="text-fo-text-secondary">Created</p>
                <p className="text-fo-dark font-medium">{new Date(persona.createdAt).toLocaleDateString()}</p>
              </div>
            )}
            {persona.updatedAt && (
              <div>
                <p className="text-fo-text-secondary">Last Updated</p>
                <p className="text-fo-dark font-medium">{new Date(persona.updatedAt).toLocaleDateString()}</p>
              </div>
            )}
            <div>
              <p className="text-fo-text-secondary">Status</p>
              <p className={`font-medium ${persona.active ? 'text-green-600' : 'text-gray-500'}`}>
                {persona.active ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div>
              <p className="text-fo-text-secondary">Persona ID</p>
              <p className="text-fo-dark font-mono text-xs">{persona.oId}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PersonaDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-fo-primary animate-spin" strokeWidth={2} />
      </div>
    }>
      <PersonaDetailContent />
    </Suspense>
  );
}
