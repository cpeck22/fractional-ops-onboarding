'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Package, Loader2, ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import UnsavedChangesWarning from '@/components/UnsavedChangesWarning';

export default function NewServiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    internalName: '',
    description: '',
    primaryUrl: '',
    summary: '',
    capabilities: [''] as string[],
    differentiatedValue: [''] as string[],
    statusQuo: [''] as string[],
    challengesAddressed: [''] as string[],
    customerBenefits: [''] as string[]
  });

  // Unsaved changes tracking - consider form filled if name is entered
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

  // Track unsaved changes
  useEffect(() => {
    // Consider form filled if any field has content (except empty array items)
    const hasContent = 
      formData.name.trim() !== '' ||
      formData.internalName.trim() !== '' ||
      formData.description.trim() !== '' ||
      formData.primaryUrl.trim() !== '' ||
      formData.summary.trim() !== '' ||
      formData.capabilities.some(c => c.trim() !== '') ||
      formData.differentiatedValue.some(v => v.trim() !== '') ||
      formData.statusQuo.some(s => s.trim() !== '') ||
      formData.challengesAddressed.some(c => c.trim() !== '') ||
      formData.customerBenefits.some(b => b.trim() !== '');
    
    setHasUnsavedChanges(hasContent);
  }, [formData]);

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!formData.name.trim()) { toast.error('Service name is required'); return; }

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      if (!authToken) throw new Error('Authentication required');

      const url = impersonateUserId ? `/api/client/gtm-strategy/services?impersonate=${impersonateUserId}` : '/api/client/gtm-strategy/services';
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create service');
      }

      toast.success('Service created successfully');
      setHasUnsavedChanges(false);
      const backUrl = impersonateUserId ? `/client/gtm-strategy?impersonate=${impersonateUserId}` : '/client/gtm-strategy';
      router.push(backUrl);
    } catch (err: any) {
      console.error('Error creating service:', err);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleArrayFieldChange = (field: string, index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).map((item, i) => i === index ? value : item)
    }));
  };

  const handleAddArrayItem = (field: string) => {
    setFormData(prev => ({ ...prev, [field]: [...(prev[field as keyof typeof prev] as string[]), ''] }));
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
    setFormData(prev => ({ ...prev, [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index) }));
    
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

  const renderArrayField = (title: string, field: keyof typeof formData, placeholder: string) => (
    <div>
      <h2 className="text-lg font-semibold text-fo-dark mb-4">{title}</h2>
      <div className="space-y-2">
        {(formData[field] as string[]).map((item, index) => (
          <div key={index} className="flex gap-2">
            <input type="text" value={item} onChange={(e) => handleArrayFieldChange(field as string, index, e.target.value)} className="flex-1 px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder={placeholder} />
            {(formData[field] as string[]).length > 1 && (
              <button onClick={() => handleRemoveArrayItem(field as string, index)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">Remove</button>
            )}
          </div>
        ))}
        <button onClick={() => handleAddArrayItem(field as string)} className="px-4 py-2 text-fo-primary border border-fo-primary rounded-lg hover:bg-fo-light transition-colors">+ Add</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button onClick={handleBack} className="p-2 hover:bg-fo-bg-light rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-fo-text-secondary" strokeWidth={2} />
            </button>
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-fo-primary" strokeWidth={2} />
              <h1 className="text-2xl font-bold text-fo-dark">Create New Service</h1>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold transition-colors disabled:opacity-50">
            {saving ? (<><Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />Creating...</>) : (<><Save className="w-4 h-4" strokeWidth={2} />Create Service</>)}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Name <span className="text-red-500">*</span></label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Service name" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Internal Name</label>
              <input type="text" value={formData.internalName} onChange={(e) => setFormData({ ...formData, internalName: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Internal name (optional)" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Brief description of the service" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Primary URL</label>
              <input type="url" value={formData.primaryUrl} onChange={(e) => setFormData({ ...formData, primaryUrl: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="https://example.com/service" />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Summary</h2>
          <textarea value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} rows={4} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Detailed summary of the service" />
        </div>

        {renderArrayField('Capabilities', 'capabilities', 'Capability')}
        {renderArrayField('Differentiated Value', 'differentiatedValue', 'Value proposition')}
        {renderArrayField('Status Quo', 'statusQuo', 'Status quo description')}
        {renderArrayField('Challenges Addressed', 'challengesAddressed', 'Challenge')}
        {renderArrayField('Customer Benefits', 'customerBenefits', 'Customer benefit')}
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
