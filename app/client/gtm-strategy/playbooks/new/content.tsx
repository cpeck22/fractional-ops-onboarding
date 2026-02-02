'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Loader2, ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import UnsavedChangesWarning from '@/components/UnsavedChangesWarning';

export default function NewPlaybookContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [allPersonas, setAllPersonas] = useState<any[]>([]);
  const [allUseCases, setAllUseCases] = useState<any[]>([]);
  const [allReferences, setAllReferences] = useState<any[]>([]);
  const [allSegments, setAllSegments] = useState<any[]>([]);
  const [allCompetitors, setAllCompetitors] = useState<any[]>([]);
  const [allProofPoints, setAllProofPoints] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    status: 'active' as string,
    keyInsight: [''],
    exampleDomains: [''] as string[],
    approachAngle: [''] as string[],
    strategicNarrative: [''] as string[],
    selectedPersonaOIds: [] as string[],
    selectedUseCaseOIds: [] as string[],
    selectedReferenceOIds: [] as string[],
    selectedSegmentOId: '',
    selectedCompetitorOId: '',
    selectedProofPointOIds: [] as string[],
    productOId: ''
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

  useEffect(() => { loadEntities(); }, [impersonateUserId]);

  useEffect(() => {
    const hasContent = Object.values(formData).some(value => {
      if (typeof value === 'string') return value.trim() !== '';
      if (Array.isArray(value)) return value.some(item => typeof item === 'string' && item.trim() !== '');
      return false;
    });
    setHasUnsavedChanges(hasContent);
  }, [formData]);

  const loadEntities = async () => {
    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Authentication required');
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      if (!authToken) throw new Error('No auth token available');

      const url = impersonateUserId ? `/api/client/gtm-strategy?impersonate=${impersonateUserId}` : '/api/client/gtm-strategy';
      const response = await fetch(url, { credentials: 'include', headers: { Authorization: `Bearer ${authToken}` } });
      if (!response.ok) throw new Error('Failed to load entities');

      const result = await response.json();
      setAllPersonas(result.personas || []);
      setAllUseCases(result.useCases || []);
      setAllReferences(result.clientReferences || []);
      setAllSegments(result.segments || []);
      setAllCompetitors(result.competitors || []);
      setAllProofPoints(result.proofPoints || []);
      setAllProducts(result.services || []);
    } catch (err: any) {
      console.error('Error loading entities:', err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!formData.description.trim()) { toast.error('Playbook description is required'); return; }
      if (!formData.keyInsight[0]?.trim()) { toast.error('Key insight is required'); return; }

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      if (!authToken) throw new Error('Authentication required');

      const url = impersonateUserId ? `/api/client/gtm-strategy/playbooks?impersonate=${impersonateUserId}` : '/api/client/gtm-strategy/playbooks';
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create playbook');
      }

      toast.success('Playbook created successfully');
      setHasUnsavedChanges(false);
      const backUrl = impersonateUserId ? `/client/gtm-strategy?impersonate=${impersonateUserId}` : '/client/gtm-strategy';
      router.push(backUrl);
    } catch (err: any) {
      console.error('Error creating playbook:', err);
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
    setFormData(prev => ({ ...prev, [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index) }));
    
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

  const toggleMultiSelect = (field: string, oId: string) => {
    setFormData(prev => {
      const current = prev[field as keyof typeof prev] as string[];
      const isSelected = current.includes(oId);
      return { ...prev, [field]: isSelected ? current.filter(id => id !== oId) : [...current, oId] };
    });
  };

  const playbookTypes = ['LEGACY', 'SECTOR', 'SOLUTION', 'MILESTONE', 'PRACTITIONER', 'COMPETITIVE', 'ACCOUNT', 'CUSTOM'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-fo-primary animate-spin mx-auto mb-4" strokeWidth={2} />
          <p className="text-fo-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button onClick={handleBack} className="p-2 hover:bg-fo-bg-light rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-fo-text-secondary" strokeWidth={2} />
            </button>
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-fo-primary" strokeWidth={2} />
              <h1 className="text-2xl font-bold text-fo-dark">Create New Playbook</h1>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold transition-colors disabled:opacity-50">
            {saving ? (<><Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />Creating...</>) : (<><Save className="w-4 h-4" strokeWidth={2} />Create Playbook</>)}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Playbook name (optional)" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Description <span className="text-red-500">*</span></label>
              <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Briefly describe the type of company, vertical, or industry you're targeting." />
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Type</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary">
                <option value="">Select type (optional)</option>
                {playbookTypes.map(type => (<option key={type} value={type}>{type}</option>))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Key Insight <span className="text-red-500">*</span></h2>
          <div className="space-y-2">
            {formData.keyInsight.map((insight, index) => (
              <div key={index} className="flex gap-2">
                <textarea value={insight} onChange={(e) => handleArrayFieldChange('keyInsight', index, e.target.value)} rows={2} className="flex-1 px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="What about your offering is unique or specifically relevant to this type of company, vertical, or industry?" />
                {formData.keyInsight.length > 1 && (
                  <button onClick={() => handleRemoveArrayItem('keyInsight', index)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">Remove</button>
                )}
              </div>
            ))}
            <button onClick={() => handleAddArrayItem('keyInsight')} className="px-4 py-2 text-fo-primary border border-fo-primary rounded-lg hover:bg-fo-light transition-colors">+ Add Insight</button>
          </div>
        </div>

        {/* Relationships */}
        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Product/Service</h2>
          <select value={formData.productOId} onChange={(e) => setFormData({ ...formData, productOId: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary">
            <option value="">None selected</option>
            {allProducts.map(p => (<option key={p.oId} value={p.oId}>{p.name}</option>))}
          </select>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Buyer Personas</h2>
          <div className="border border-fo-border rounded-lg p-3 max-h-48 overflow-y-auto">
            {allPersonas.length === 0 ? (
              <p className="text-fo-text-secondary text-sm">No personas available</p>
            ) : (
              allPersonas.map(persona => (
                <label key={persona.oId} className="flex items-center gap-2 p-2 hover:bg-fo-bg-light rounded cursor-pointer">
                  <input type="checkbox" checked={formData.selectedPersonaOIds.includes(persona.oId)} onChange={() => toggleMultiSelect('selectedPersonaOIds', persona.oId)} className="w-4 h-4 text-fo-primary rounded" />
                  <span className="text-sm text-fo-dark">{persona.name}</span>
                </label>
              ))
            )}
          </div>
          <p className="text-xs text-fo-text-secondary mt-1">{formData.selectedPersonaOIds.length} selected</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Use Cases</h2>
          <div className="border border-fo-border rounded-lg p-3 max-h-48 overflow-y-auto">
            {allUseCases.length === 0 ? (
              <p className="text-fo-text-secondary text-sm">No use cases available</p>
            ) : (
              allUseCases.map(uc => (
                <label key={uc.oId} className="flex items-center gap-2 p-2 hover:bg-fo-bg-light rounded cursor-pointer">
                  <input type="checkbox" checked={formData.selectedUseCaseOIds.includes(uc.oId)} onChange={() => toggleMultiSelect('selectedUseCaseOIds', uc.oId)} className="w-4 h-4 text-fo-primary rounded" />
                  <span className="text-sm text-fo-dark">{uc.name}</span>
                </label>
              ))
            )}
          </div>
          <p className="text-xs text-fo-text-secondary mt-1">{formData.selectedUseCaseOIds.length} selected</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">References</h2>
          <div className="border border-fo-border rounded-lg p-3 max-h-48 overflow-y-auto">
            {allReferences.length === 0 ? (
              <p className="text-fo-text-secondary text-sm">No references available</p>
            ) : (
              allReferences.map(ref => (
                <label key={ref.oId} className="flex items-center gap-2 p-2 hover:bg-fo-bg-light rounded cursor-pointer">
                  <input type="checkbox" checked={formData.selectedReferenceOIds.includes(ref.oId)} onChange={() => toggleMultiSelect('selectedReferenceOIds', ref.oId)} className="w-4 h-4 text-fo-primary rounded" />
                  <span className="text-sm text-fo-dark">{ref.name}</span>
                </label>
              ))
            )}
          </div>
          <p className="text-xs text-fo-text-secondary mt-1">{formData.selectedReferenceOIds.length} selected</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Segment</h2>
          <select value={formData.selectedSegmentOId} onChange={(e) => setFormData({ ...formData, selectedSegmentOId: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary">
            <option value="">None selected</option>
            {allSegments.map(s => (<option key={s.oId} value={s.oId}>{s.name}</option>))}
          </select>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Competitor</h2>
          <select value={formData.selectedCompetitorOId} onChange={(e) => setFormData({ ...formData, selectedCompetitorOId: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary">
            <option value="">None selected</option>
            {allCompetitors.map(c => (<option key={c.oId} value={c.oId}>{c.name}</option>))}
          </select>
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

