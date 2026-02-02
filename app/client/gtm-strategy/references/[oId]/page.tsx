'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Building2, Loader2, ArrowLeft, Edit, Save, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import UnsavedChangesWarning from '@/components/UnsavedChangesWarning';

export const dynamic = 'force-dynamic';

interface ReferenceData {
  oId: string;
  name: string;
  internalName?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  active?: boolean;
  data?: {
    howTheyMakeMoney?: string;
    howTheyUseProduct?: string;
    howTheyBenefitFromProduct?: string;
    emailSnippets?: string[];
    howWeImpactedTheirBusiness?: string[];
    keyStats?: string[];
    customFields?: Array<{ title: string; value: string[] }>;
  };
  user?: any;
  workspace?: any;
  unrecognized?: boolean;
}

function ReferenceDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const referenceOId = params.oId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reference, setReference] = useState<ReferenceData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    internalName: '',
    description: '',
    howTheyMakeMoney: '',
    howTheyUseProduct: '',
    howTheyBenefitFromProduct: '',
    emailSnippets: [] as string[],
    howWeImpactedTheirBusiness: [] as string[],
    keyStats: [] as string[]
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    field: string;
    index: number;
    itemName: string;
  }>({
    isOpen: false,
    field: '',
    index: -1,
    itemName: ''
  });

  useEffect(() => {
    loadReference();
  }, [referenceOId, impersonateUserId]);

  useEffect(() => {
    if (!reference || !isEditing) {
      setHasUnsavedChanges(false);
      return;
    }

    const hasChanges = 
      formData.name !== (reference.name || '') ||
      formData.internalName !== (reference.internalName || '') ||
      formData.description !== (reference.description || '') ||
      formData.howTheyMakeMoney !== (reference.data?.howTheyMakeMoney || '') ||
      formData.howTheyUseProduct !== (reference.data?.howTheyUseProduct || '') ||
      formData.howTheyBenefitFromProduct !== (reference.data?.howTheyBenefitFromProduct || '') ||
      JSON.stringify(formData.emailSnippets) !== JSON.stringify(reference.data?.emailSnippets || []) ||
      JSON.stringify(formData.howWeImpactedTheirBusiness) !== JSON.stringify(reference.data?.howWeImpactedTheirBusiness || []) ||
      JSON.stringify(formData.keyStats) !== JSON.stringify(reference.data?.keyStats || []);

    setHasUnsavedChanges(hasChanges);
  }, [formData, reference, isEditing]);

  const loadReference = async () => {
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

      if (!response.ok) throw new Error('Failed to load reference data');

      const result = await response.json();
      const foundReference = result.clientReferences?.find((r: ReferenceData) => r.oId === referenceOId);

      if (!foundReference) throw new Error('Reference not found');

      setReference(foundReference);
      setFormData({
        name: foundReference.name || '',
        internalName: foundReference.internalName || '',
        description: foundReference.description || '',
        howTheyMakeMoney: foundReference.data?.howTheyMakeMoney || '',
        howTheyUseProduct: foundReference.data?.howTheyUseProduct || '',
        howTheyBenefitFromProduct: foundReference.data?.howTheyBenefitFromProduct || '',
        emailSnippets: foundReference.data?.emailSnippets || [],
        howWeImpactedTheirBusiness: foundReference.data?.howWeImpactedTheirBusiness || [],
        keyStats: foundReference.data?.keyStats || []
      });

    } catch (err: any) {
      console.error('Error loading reference:', err);
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
        toast.error('Reference name is required');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      if (!authToken) throw new Error('Authentication required');

      const url = impersonateUserId
        ? `/api/client/gtm-strategy/references?impersonate=${impersonateUserId}`
        : '/api/client/gtm-strategy/references';

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ oId: referenceOId, ...formData })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save reference');
      }

      toast.success('Reference updated successfully');
      setHasUnsavedChanges(false);
      setIsEditing(false);
      await loadReference();

    } catch (err: any) {
      console.error('Error saving reference:', err);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmed) return;
    }

    if (reference) {
      setFormData({
        name: reference.name || '',
        internalName: reference.internalName || '',
        description: reference.description || '',
        howTheyMakeMoney: reference.data?.howTheyMakeMoney || '',
        howTheyUseProduct: reference.data?.howTheyUseProduct || '',
        howTheyBenefitFromProduct: reference.data?.howTheyBenefitFromProduct || '',
        emailSnippets: reference.data?.emailSnippets || [],
        howWeImpactedTheirBusiness: reference.data?.howWeImpactedTheirBusiness || [],
        keyStats: reference.data?.keyStats || []
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
    const fieldArray = formData[field as keyof typeof formData] as string[];
    const itemName = fieldArray[index] || 'this item';
    
    setDeleteConfirmation({
      isOpen: true,
      field,
      index,
      itemName
    });
  };

  const handleConfirmDelete = () => {
    const { field, index } = deleteConfirmation;
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index)
    }));
    
    setDeleteConfirmation({
      isOpen: false,
      field: '',
      index: -1,
      itemName: ''
    });
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave this page?');
      if (!confirmed) return;
    }
    router.back();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-fo-primary animate-spin mx-auto mb-4" strokeWidth={2} />
          <p className="text-fo-text-secondary">Loading reference details...</p>
        </div>
      </div>
    );
  }

  if (error || !reference) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-fo-dark mb-4">Error Loading Reference</h1>
          <p className="text-fo-text-secondary mb-6">{error || 'Reference not found'}</p>
          <button onClick={handleBack} className="px-6 py-3 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold">
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
            <button onClick={handleBack} className="p-2 hover:bg-fo-bg-light rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-fo-text-secondary" strokeWidth={2} />
            </button>
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-fo-primary" strokeWidth={2} />
              <div>
                <h1 className="text-2xl font-bold text-fo-dark">{reference.name}</h1>
                {reference.internalName && <p className="text-sm text-fo-text-secondary">Internal: {reference.internalName}</p>}
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
                Edit Reference
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reference Details */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Name</label>
              {isEditing ? (
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Reference name" />
              ) : (
                <p className="text-fo-dark font-medium">{reference.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Internal Name</label>
              {isEditing ? (
                <input type="text" value={formData.internalName} onChange={(e) => setFormData({ ...formData, internalName: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Internal name (optional)" />
              ) : reference.internalName ? (
                <p className="text-fo-dark">{reference.internalName}</p>
              ) : (
                <p className="text-fo-text-secondary italic">Not specified</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Description</label>
              {isEditing ? (
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Brief description" />
              ) : reference.description ? (
                <p className="text-fo-dark">{reference.description}</p>
              ) : (
                <p className="text-fo-text-secondary italic">No description</p>
              )}
            </div>
          </div>
        </div>

        {/* How They Make Money */}
        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">How They Make Money</h2>
          {isEditing ? (
            <textarea value={formData.howTheyMakeMoney} onChange={(e) => setFormData({ ...formData, howTheyMakeMoney: e.target.value })} rows={3} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Describe their business model" />
          ) : reference.data?.howTheyMakeMoney ? (
            <p className="text-fo-dark bg-fo-bg-light p-4 rounded-lg">{reference.data.howTheyMakeMoney}</p>
          ) : (
            <p className="text-fo-text-secondary italic">Not specified</p>
          )}
        </div>

        {/* How They Use Product */}
        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">How They Use Product</h2>
          {isEditing ? (
            <textarea value={formData.howTheyUseProduct} onChange={(e) => setFormData({ ...formData, howTheyUseProduct: e.target.value })} rows={3} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Describe how they use your product" />
          ) : reference.data?.howTheyUseProduct ? (
            <p className="text-fo-dark bg-fo-bg-light p-4 rounded-lg">{reference.data.howTheyUseProduct}</p>
          ) : (
            <p className="text-fo-text-secondary italic">Not specified</p>
          )}
        </div>

        {/* How They Benefit From Product */}
        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">How They Benefit From Product</h2>
          {isEditing ? (
            <textarea value={formData.howTheyBenefitFromProduct} onChange={(e) => setFormData({ ...formData, howTheyBenefitFromProduct: e.target.value })} rows={3} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Describe the benefits they receive" />
          ) : reference.data?.howTheyBenefitFromProduct ? (
            <p className="text-fo-dark bg-fo-bg-light p-4 rounded-lg">{reference.data.howTheyBenefitFromProduct}</p>
          ) : (
            <p className="text-fo-text-secondary italic">Not specified</p>
          )}
        </div>

        {renderArrayField('Email Snippets', 'emailSnippets', 'Email snippet', reference.data?.emailSnippets)}
        {renderArrayField('How We Impacted Their Business', 'howWeImpactedTheirBusiness', 'Business impact', reference.data?.howWeImpactedTheirBusiness)}
        {renderArrayField('Key Stats', 'keyStats', 'Statistic', reference.data?.keyStats)}

        {/* Metadata */}
        <div className="border-t border-fo-border pt-6">
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Metadata</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {reference.createdAt && (
              <div>
                <p className="text-fo-text-secondary">Created</p>
                <p className="text-fo-dark font-medium">{new Date(reference.createdAt).toLocaleDateString()}</p>
              </div>
            )}
            {reference.updatedAt && (
              <div>
                <p className="text-fo-text-secondary">Last Updated</p>
                <p className="text-fo-dark font-medium">{new Date(reference.updatedAt).toLocaleDateString()}</p>
              </div>
            )}
            <div>
              <p className="text-fo-text-secondary">Status</p>
              <p className={`font-medium ${reference.active ? 'text-green-600' : 'text-gray-500'}`}>
                {reference.active ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div>
              <p className="text-fo-text-secondary">Reference ID</p>
              <p className="text-fo-dark font-mono text-xs">{reference.oId}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      <UnsavedChangesWarning hasUnsavedChanges={hasUnsavedChanges} />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, field: '', index: -1, itemName: '' })}
        onConfirm={handleConfirmDelete}
        itemName={deleteConfirmation.itemName}
        itemType="item"
      />
    </div>
  );
}

export default function ReferenceDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-fo-primary animate-spin" strokeWidth={2} />
      </div>
    }>
      <ReferenceDetailContent />
    </Suspense>
  );
}
