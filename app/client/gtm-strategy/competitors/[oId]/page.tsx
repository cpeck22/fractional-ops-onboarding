'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Swords, Loader2, ArrowLeft, Edit, Save, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function CompetitorDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const competitorOId = params.oId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [competitor, setCompetitor] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    internalName: '',
    description: '',
    businessModel: [] as string[],
    comparativeStrengths: [] as string[],
    comparativeWeaknesses: [] as string[],
    keyDifferentiators: [] as string[],
    reasonsWeWin: [] as string[]
  });

  useEffect(() => { loadCompetitor(); }, [competitorOId, impersonateUserId]);

  const loadCompetitor = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Authentication required');
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      if (!authToken) throw new Error('No auth token available');

      const url = impersonateUserId ? `/api/client/gtm-strategy?impersonate=${impersonateUserId}` : '/api/client/gtm-strategy';
      const response = await fetch(url, { credentials: 'include', headers: { Authorization: `Bearer ${authToken}` } });
      if (!response.ok) throw new Error('Failed to load competitor data');

      const result = await response.json();
      const found = result.competitors?.find((c: any) => c.oId === competitorOId);
      if (!found) throw new Error('Competitor not found');

      setCompetitor(found);
      setFormData({
        name: found.name || '',
        internalName: found.internalName || '',
        description: found.description || '',
        businessModel: found.data?.businessModel || [],
        comparativeStrengths: found.data?.comparativeStrengths || [],
        comparativeWeaknesses: found.data?.comparativeWeaknesses || [],
        keyDifferentiators: found.data?.keyDifferentiators || [],
        reasonsWeWin: found.data?.reasonsWeWin || []
      });
    } catch (err: any) {
      console.error('Error loading competitor:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!formData.name.trim()) { toast.error('Competitor name is required'); return; }
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      if (!authToken) throw new Error('Authentication required');

      const url = impersonateUserId ? `/api/client/gtm-strategy/competitors?impersonate=${impersonateUserId}` : '/api/client/gtm-strategy/competitors';
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ oId: competitorOId, ...formData })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save competitor');
      }

      toast.success('Competitor updated successfully');
      setIsEditing(false);
      await loadCompetitor();
    } catch (err: any) {
      console.error('Error saving competitor:', err);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (competitor) {
      setFormData({
        name: competitor.name || '',
        internalName: competitor.internalName || '',
        description: competitor.description || '',
        businessModel: competitor.data?.businessModel || [],
        comparativeStrengths: competitor.data?.comparativeStrengths || [],
        comparativeWeaknesses: competitor.data?.comparativeWeaknesses || [],
        keyDifferentiators: competitor.data?.keyDifferentiators || [],
        reasonsWeWin: competitor.data?.reasonsWeWin || []
      });
    }
    setIsEditing(false);
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
    setFormData(prev => ({ ...prev, [field]: (prev[field as keyof typeof prev] as string[]).filter((_, i) => i !== index) }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-fo-primary animate-spin mx-auto mb-4" strokeWidth={2} />
          <p className="text-fo-text-secondary">Loading competitor details...</p>
        </div>
      </div>
    );
  }

  if (error || !competitor) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-fo-dark mb-4">Error Loading Competitor</h1>
          <p className="text-fo-text-secondary mb-6">{error || 'Competitor not found'}</p>
          <button onClick={() => router.back()} className="px-6 py-3 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold">Go Back</button>
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
              <input type="text" value={item} onChange={(e) => handleArrayFieldChange(field as string, index, e.target.value)} className="flex-1 px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder={placeholder} />
              <button onClick={() => handleRemoveArrayItem(field as string, index)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">Remove</button>
            </div>
          ))}
          <button onClick={() => handleAddArrayItem(field as string)} className="px-4 py-2 text-fo-primary border border-fo-primary rounded-lg hover:bg-fo-light transition-colors">+ Add</button>
        </div>
      ) : data && data.length > 0 ? (
        <ul className="list-disc list-inside space-y-2 bg-fo-bg-light p-4 rounded-lg">
          {data.map((item, idx) => (<li key={idx} className="text-fo-dark">{item}</li>))}
        </ul>
      ) : (
        <p className="text-fo-text-secondary italic">No {title.toLowerCase()} listed</p>
      )}
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
              <Swords className="w-6 h-6 text-fo-primary" strokeWidth={2} />
              <div>
                <h1 className="text-2xl font-bold text-fo-dark">{competitor.name}</h1>
                {competitor.internalName && <p className="text-sm text-fo-text-secondary">Internal: {competitor.internalName}</p>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <button onClick={handleCancel} disabled={saving} className="flex items-center gap-2 px-4 py-2 border border-fo-border rounded-lg hover:bg-fo-bg-light font-semibold transition-colors disabled:opacity-50">
                  <X className="w-4 h-4" strokeWidth={2} />Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold transition-colors disabled:opacity-50">
                  {saving ? (<><Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />Saving...</>) : (<><Save className="w-4 h-4" strokeWidth={2} />Save Changes</>)}
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold">
                <Edit className="w-4 h-4" strokeWidth={2} />Edit Competitor
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Name</label>
              {isEditing ? (
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Competitor name" />
              ) : (<p className="text-fo-dark font-medium">{competitor.name}</p>)}
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Internal Name</label>
              {isEditing ? (
                <input type="text" value={formData.internalName} onChange={(e) => setFormData({ ...formData, internalName: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Internal name (optional)" />
              ) : competitor.internalName ? (<p className="text-fo-dark">{competitor.internalName}</p>) : (<p className="text-fo-text-secondary italic">Not specified</p>)}
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Description</label>
              {isEditing ? (
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Brief description" />
              ) : competitor.description ? (<p className="text-fo-dark">{competitor.description}</p>) : (<p className="text-fo-text-secondary italic">No description</p>)}
            </div>
          </div>
        </div>

        {renderArrayField('Business Model', 'businessModel', 'Business model element', competitor.data?.businessModel)}
        {renderArrayField('Comparative Strengths', 'comparativeStrengths', 'Strength', competitor.data?.comparativeStrengths)}
        {renderArrayField('Comparative Weaknesses', 'comparativeWeaknesses', 'Weakness', competitor.data?.comparativeWeaknesses)}
        {renderArrayField('Key Differentiators', 'keyDifferentiators', 'Differentiator', competitor.data?.keyDifferentiators)}
        {renderArrayField('Reasons We Win', 'reasonsWeWin', 'Reason', competitor.data?.reasonsWeWin)}

        <div className="border-t border-fo-border pt-6">
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Metadata</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {competitor.createdAt && (<div><p className="text-fo-text-secondary">Created</p><p className="text-fo-dark font-medium">{new Date(competitor.createdAt).toLocaleDateString()}</p></div>)}
            {competitor.updatedAt && (<div><p className="text-fo-text-secondary">Last Updated</p><p className="text-fo-dark font-medium">{new Date(competitor.updatedAt).toLocaleDateString()}</p></div>)}
            <div><p className="text-fo-text-secondary">Status</p><p className={`font-medium ${competitor.active ? 'text-green-600' : 'text-gray-500'}`}>{competitor.active ? 'Active' : 'Inactive'}</p></div>
            <div><p className="text-fo-text-secondary">Competitor ID</p><p className="text-fo-dark font-mono text-xs">{competitor.oId}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompetitorDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-fo-primary animate-spin" strokeWidth={2} />
      </div>
    }>
      <CompetitorDetailContent />
    </Suspense>
  );
}
