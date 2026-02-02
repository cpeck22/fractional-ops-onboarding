'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Package, Loader2, ArrowLeft, Edit, Save, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import UnsavedChangesWarning from '@/components/UnsavedChangesWarning';

export const dynamic = 'force-dynamic';

interface ServiceData {
  oId: string;
  name: string;
  internalName?: string;
  description?: string;
  primaryUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  active?: boolean;
  data?: {
    type?: string;
    internalName?: string;
    summary?: string;
    capabilities?: string[];
    differentiatedValue?: string[];
    statusQuo?: string[];
    challengesAddressed?: string[];
    customerBenefits?: string[];
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

function ServiceDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const serviceOId = params.oId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [service, setService] = useState<ServiceData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [formData, setFormData] = useState({
    name: '',
    internalName: '',
    description: '',
    primaryUrl: '',
    summary: '',
    capabilities: [] as string[],
    differentiatedValue: [] as string[],
    statusQuo: [] as string[],
    challengesAddressed: [] as string[],
    customerBenefits: [] as string[]
  });

  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Delete confirmation modal state
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
    loadService();
  }, [serviceOId, impersonateUserId]);

  // Track unsaved changes
  useEffect(() => {
    if (!service || !isEditing) {
      setHasUnsavedChanges(false);
      return;
    }

    // Compare formData with original service data
    const hasChanges = 
      formData.name !== (service.name || '') ||
      formData.internalName !== (service.internalName || '') ||
      formData.description !== (service.description || '') ||
      formData.primaryUrl !== (service.primaryUrl || '') ||
      formData.summary !== (service.data?.summary || '') ||
      JSON.stringify(formData.capabilities) !== JSON.stringify(service.data?.capabilities || []) ||
      JSON.stringify(formData.differentiatedValue) !== JSON.stringify(service.data?.differentiatedValue || []) ||
      JSON.stringify(formData.statusQuo) !== JSON.stringify(service.data?.statusQuo || []) ||
      JSON.stringify(formData.challengesAddressed) !== JSON.stringify(service.data?.challengesAddressed || []) ||
      JSON.stringify(formData.customerBenefits) !== JSON.stringify(service.data?.customerBenefits || []);

    setHasUnsavedChanges(hasChanges);
  }, [formData, service, isEditing]);

  const loadService = async () => {
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

      // Fetch all GTM strategy data to get this specific service
      const url = impersonateUserId
        ? `/api/client/gtm-strategy?impersonate=${impersonateUserId}`
        : '/api/client/gtm-strategy';

      const response = await fetch(url, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (!response.ok) {
        throw new Error('Failed to load service data');
      }

      const result = await response.json();
      const foundService = result.services?.find((s: ServiceData) => s.oId === serviceOId);

      if (!foundService) {
        throw new Error('Service not found');
      }

      setService(foundService);
      
      // Initialize form data
      setFormData({
        name: foundService.name || '',
        internalName: foundService.internalName || '',
        description: foundService.description || '',
        primaryUrl: foundService.primaryUrl || '',
        summary: foundService.data?.summary || '',
        capabilities: foundService.data?.capabilities || [],
        differentiatedValue: foundService.data?.differentiatedValue || [],
        statusQuo: foundService.data?.statusQuo || [],
        challengesAddressed: foundService.data?.challengesAddressed || [],
        customerBenefits: foundService.data?.customerBenefits || []
      });

    } catch (err: any) {
      console.error('Error loading service:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Client-side validation (hybrid approach)
      if (!formData.name.trim()) {
        toast.error('Service name is required');
        return;
      }

      // Validate URL format if provided
      if (formData.primaryUrl && formData.primaryUrl.trim()) {
        try {
          new URL(formData.primaryUrl);
        } catch {
          toast.error('Invalid URL format');
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      if (!authToken) {
        throw new Error('Authentication required');
      }

      const url = impersonateUserId
        ? `/api/client/gtm-strategy/services?impersonate=${impersonateUserId}`
        : '/api/client/gtm-strategy/services';

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          oId: serviceOId,
          ...formData
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save service');
      }

      toast.success('Service updated successfully');
      setHasUnsavedChanges(false);
      setIsEditing(false);
      await loadService();

    } catch (err: any) {
      console.error('Error saving service:', err);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Check for unsaved changes
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmed) return;
    }

    // Reset form data to original service data
    if (service) {
      setFormData({
        name: service.name || '',
        internalName: service.internalName || '',
        description: service.description || '',
        primaryUrl: service.primaryUrl || '',
        summary: service.data?.summary || '',
        capabilities: service.data?.capabilities || [],
        differentiatedValue: service.data?.differentiatedValue || [],
        statusQuo: service.data?.statusQuo || [],
        challengesAddressed: service.data?.challengesAddressed || [],
        customerBenefits: service.data?.customerBenefits || []
      });
    }
    setHasUnsavedChanges(false);
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
    // Get the item value for the confirmation modal
    const fieldArray = formData[field as keyof typeof formData] as string[];
    const itemName = fieldArray[index] || 'this item';
    
    // Show delete confirmation modal
    setDeleteConfirmation({
      isOpen: true,
      field,
      index,
      itemName
    });
  };

  const handleConfirmDelete = () => {
    // Actually delete the item
    const { field, index } = deleteConfirmation;
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index)
    }));
    
    // Close modal
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
          <p className="text-fo-text-secondary">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-fo-dark mb-4">Error Loading Service</h1>
          <p className="text-fo-text-secondary mb-6">{error || 'Service not found'}</p>
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-fo-bg-light rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-fo-text-secondary" strokeWidth={2} />
            </button>
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-fo-primary" strokeWidth={2} />
              <div>
                <h1 className="text-2xl font-bold text-fo-dark">{service.name}</h1>
                {service.internalName && (
                  <p className="text-sm text-fo-text-secondary">Internal: {service.internalName}</p>
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
                Edit Service
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Service Details */}
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
                  placeholder="Service name"
                />
              ) : (
                <p className="text-fo-dark font-medium">{service.name}</p>
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
              ) : service.internalName ? (
                <p className="text-fo-dark">{service.internalName}</p>
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
                  placeholder="Brief description of the service"
                />
              ) : service.description ? (
                <p className="text-fo-dark">{service.description}</p>
              ) : (
                <p className="text-fo-text-secondary italic">No description</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Primary URL</label>
              {isEditing ? (
                <input
                  type="url"
                  value={formData.primaryUrl}
                  onChange={(e) => setFormData({ ...formData, primaryUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
                  placeholder="https://example.com/service"
                />
              ) : service.primaryUrl ? (
                <a 
                  href={service.primaryUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-fo-primary hover:underline"
                >
                  {service.primaryUrl}
                </a>
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
            <textarea
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
              placeholder="Detailed summary of the service"
            />
          ) : service.data?.summary ? (
            <p className="text-fo-dark bg-fo-bg-light p-4 rounded-lg">{service.data.summary}</p>
          ) : (
            <p className="text-fo-text-secondary italic">No summary available</p>
          )}
        </div>

        {/* Capabilities */}
        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Capabilities</h2>
          {isEditing ? (
            <div className="space-y-2">
              {formData.capabilities.map((cap, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={cap}
                    onChange={(e) => handleArrayFieldChange('capabilities', index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
                    placeholder="Capability"
                  />
                  <button
                    onClick={() => handleRemoveArrayItem('capabilities', index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleAddArrayItem('capabilities')}
                className="px-4 py-2 text-fo-primary border border-fo-primary rounded-lg hover:bg-fo-light transition-colors"
              >
                + Add Capability
              </button>
            </div>
          ) : service.data?.capabilities && service.data.capabilities.length > 0 ? (
            <ul className="list-disc list-inside space-y-2 bg-fo-bg-light p-4 rounded-lg">
              {service.data.capabilities.map((cap, idx) => (
                <li key={idx} className="text-fo-dark">{cap}</li>
              ))}
            </ul>
          ) : (
            <p className="text-fo-text-secondary italic">No capabilities listed</p>
          )}
        </div>

        {/* Differentiated Value */}
        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Differentiated Value</h2>
          {isEditing ? (
            <div className="space-y-2">
              {formData.differentiatedValue.map((val, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => handleArrayFieldChange('differentiatedValue', index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
                    placeholder="Value proposition"
                  />
                  <button
                    onClick={() => handleRemoveArrayItem('differentiatedValue', index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleAddArrayItem('differentiatedValue')}
                className="px-4 py-2 text-fo-primary border border-fo-primary rounded-lg hover:bg-fo-light transition-colors"
              >
                + Add Value
              </button>
            </div>
          ) : service.data?.differentiatedValue && service.data.differentiatedValue.length > 0 ? (
            <ul className="list-disc list-inside space-y-2 bg-fo-bg-light p-4 rounded-lg">
              {service.data.differentiatedValue.map((val, idx) => (
                <li key={idx} className="text-fo-dark">{val}</li>
              ))}
            </ul>
          ) : (
            <p className="text-fo-text-secondary italic">No differentiated values listed</p>
          )}
        </div>

        {/* Status Quo */}
        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Status Quo</h2>
          {isEditing ? (
            <div className="space-y-2">
              {formData.statusQuo.map((sq, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={sq}
                    onChange={(e) => handleArrayFieldChange('statusQuo', index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
                    placeholder="Status quo description"
                  />
                  <button
                    onClick={() => handleRemoveArrayItem('statusQuo', index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleAddArrayItem('statusQuo')}
                className="px-4 py-2 text-fo-primary border border-fo-primary rounded-lg hover:bg-fo-light transition-colors"
              >
                + Add Status Quo
              </button>
            </div>
          ) : service.data?.statusQuo && service.data.statusQuo.length > 0 ? (
            <ul className="list-disc list-inside space-y-2 bg-fo-bg-light p-4 rounded-lg">
              {service.data.statusQuo.map((sq, idx) => (
                <li key={idx} className="text-fo-dark">{sq}</li>
              ))}
            </ul>
          ) : (
            <p className="text-fo-text-secondary italic">No status quo listed</p>
          )}
        </div>

        {/* Challenges Addressed */}
        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Challenges Addressed</h2>
          {isEditing ? (
            <div className="space-y-2">
              {formData.challengesAddressed.map((challenge, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={challenge}
                    onChange={(e) => handleArrayFieldChange('challengesAddressed', index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
                    placeholder="Challenge"
                  />
                  <button
                    onClick={() => handleRemoveArrayItem('challengesAddressed', index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleAddArrayItem('challengesAddressed')}
                className="px-4 py-2 text-fo-primary border border-fo-primary rounded-lg hover:bg-fo-light transition-colors"
              >
                + Add Challenge
              </button>
            </div>
          ) : service.data?.challengesAddressed && service.data.challengesAddressed.length > 0 ? (
            <ul className="list-disc list-inside space-y-2 bg-fo-bg-light p-4 rounded-lg">
              {service.data.challengesAddressed.map((challenge, idx) => (
                <li key={idx} className="text-fo-dark">{challenge}</li>
              ))}
            </ul>
          ) : (
            <p className="text-fo-text-secondary italic">No challenges listed</p>
          )}
        </div>

        {/* Customer Benefits */}
        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Customer Benefits</h2>
          {isEditing ? (
            <div className="space-y-2">
              {formData.customerBenefits.map((benefit, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={benefit}
                    onChange={(e) => handleArrayFieldChange('customerBenefits', index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
                    placeholder="Customer benefit"
                  />
                  <button
                    onClick={() => handleRemoveArrayItem('customerBenefits', index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleAddArrayItem('customerBenefits')}
                className="px-4 py-2 text-fo-primary border border-fo-primary rounded-lg hover:bg-fo-light transition-colors"
              >
                + Add Benefit
              </button>
            </div>
          ) : service.data?.customerBenefits && service.data.customerBenefits.length > 0 ? (
            <ul className="list-disc list-inside space-y-2 bg-fo-bg-light p-4 rounded-lg">
              {service.data.customerBenefits.map((benefit, idx) => (
                <li key={idx} className="text-fo-dark">{benefit}</li>
              ))}
            </ul>
          ) : (
            <p className="text-fo-text-secondary italic">No customer benefits listed</p>
          )}
        </div>

        {/* Qualifying Questions */}
        {service.qualifyingQuestions && service.qualifyingQuestions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-fo-dark mb-4">Qualifying Questions</h2>
            <div className="space-y-4">
              {service.qualifyingQuestions.map((q, idx) => (
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
            {service.createdAt && (
              <div>
                <p className="text-fo-text-secondary">Created</p>
                <p className="text-fo-dark font-medium">{new Date(service.createdAt).toLocaleDateString()}</p>
              </div>
            )}
            {service.updatedAt && (
              <div>
                <p className="text-fo-text-secondary">Last Updated</p>
                <p className="text-fo-dark font-medium">{new Date(service.updatedAt).toLocaleDateString()}</p>
              </div>
            )}
            <div>
              <p className="text-fo-text-secondary">Status</p>
              <p className={`font-medium ${service.active ? 'text-green-600' : 'text-gray-500'}`}>
                {service.active ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div>
              <p className="text-fo-text-secondary">Service ID</p>
              <p className="text-fo-dark font-mono text-xs">{service.oId}</p>
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

export default function ServiceDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-fo-primary animate-spin" strokeWidth={2} />
      </div>
    }>
      <ServiceDetailContent />
    </Suspense>
  );
}
