'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Loader2, ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function NewReferenceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    internalName: '',
    description: '',
    howTheyMakeMoney: '',
    howTheyUseProduct: '',
    howTheyBenefitFromProduct: '',
    emailSnippets: [''] as string[],
    howWeImpactedTheirBusiness: [''] as string[],
    keyStats: [''] as string[]
  });

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!formData.name.trim()) { toast.error('Reference name is required'); return; }

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      if (!authToken) throw new Error('Authentication required');

      const url = impersonateUserId ? `/api/client/gtm-strategy/references?impersonate=${impersonateUserId}` : '/api/client/gtm-strategy/references';
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create reference');
      }

      toast.success('Reference created successfully');
      const backUrl = impersonateUserId ? `/client/gtm-strategy?impersonate=${impersonateUserId}` : '/client/gtm-strategy';
      router.push(backUrl);
    } catch (err: any) {
      console.error('Error creating reference:', err);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleArrayFieldChange = (field: string, index: number, value: string) => {
    setFormData(prev => ({ ...prev, [field]: (prev[field as keyof typeof prev] as string[]).map((item, i) => i === index ? value : item) }));
  };

  const handleAddArrayItem = (field: string) => {
    setFormData(prev => ({ ...prev, [field]: [...(prev[field as keyof typeof prev] as string[]), ''] }));
  };

  const handleRemoveArrayItem = (field: string, index: number) => {
    setFormData(prev => ({ ...prev, [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index) }));
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
            <button onClick={() => router.back()} className="p-2 hover:bg-fo-bg-light rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-fo-text-secondary" strokeWidth={2} />
            </button>
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-fo-primary" strokeWidth={2} />
              <h1 className="text-2xl font-bold text-fo-dark">Create New Reference</h1>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold transition-colors disabled:opacity-50">
            {saving ? (<><Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />Creating...</>) : (<><Save className="w-4 h-4" strokeWidth={2} />Create Reference</>)}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Name <span className="text-red-500">*</span></label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Reference name" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Internal Name</label>
              <input type="text" value={formData.internalName} onChange={(e) => setFormData({ ...formData, internalName: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Internal name (optional)" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Description</label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Brief description" />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">How They Make Money</h2>
          <textarea value={formData.howTheyMakeMoney} onChange={(e) => setFormData({ ...formData, howTheyMakeMoney: e.target.value })} rows={3} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Describe their business model" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">How They Use Product</h2>
          <textarea value={formData.howTheyUseProduct} onChange={(e) => setFormData({ ...formData, howTheyUseProduct: e.target.value })} rows={3} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Describe how they use your product" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">How They Benefit From Product</h2>
          <textarea value={formData.howTheyBenefitFromProduct} onChange={(e) => setFormData({ ...formData, howTheyBenefitFromProduct: e.target.value })} rows={3} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Describe the benefits they receive" />
        </div>

        {renderArrayField('Email Snippets', 'emailSnippets', 'Email snippet')}
        {renderArrayField('How We Impacted Their Business', 'howWeImpactedTheirBusiness', 'Business impact')}
        {renderArrayField('Key Stats', 'keyStats', 'Statistic')}
      </div>
    </div>
  );
}

export default function NewReferencePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-fo-primary animate-spin" strokeWidth={2} />
      </div>
    }>
      <NewReferenceContent />
    </Suspense>
  );
}
