'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Award, Loader2, ArrowLeft, Edit, Save, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function ProofPointDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const proofPointOId = params.oId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [proofPoint, setProofPoint] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    internalName: '',
    description: '',
    type: 'stat' as string,
    howWeTalkAboutThis: [] as string[],
    whyThisMatters: [] as string[]
  });

  useEffect(() => { loadProofPoint(); }, [proofPointOId, impersonateUserId]);

  const loadProofPoint = async () => {
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
      if (!response.ok) throw new Error('Failed to load proof point data');

      const result = await response.json();
      const found = result.proofPoints?.find((p: any) => p.oId === proofPointOId);
      if (!found) throw new Error('Proof point not found');

      setProofPoint(found);
      setFormData({
        name: found.name || '',
        internalName: found.internalName || '',
        description: found.description || '',
        type: found.data?.type || 'stat',
        howWeTalkAboutThis: found.data?.howWeTalkAboutThis || [],
        whyThisMatters: found.data?.whyThisMatters || []
      });
    } catch (err: any) {
      console.error('Error loading proof point:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!formData.name.trim()) { toast.error('Proof point name is required'); return; }
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      if (!authToken) throw new Error('Authentication required');

      const url = impersonateUserId ? `/api/client/gtm-strategy/proof-points?impersonate=${impersonateUserId}` : '/api/client/gtm-strategy/proof-points';
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ oId: proofPointOId, ...formData })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save proof point');
      }

      toast.success('Proof point updated successfully');
      setIsEditing(false);
      await loadProofPoint();
    } catch (err: any) {
      console.error('Error saving proof point:', err);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (proofPoint) {
      setFormData({
        name: proofPoint.name || '',
        internalName: proofPoint.internalName || '',
        description: proofPoint.description || '',
        type: proofPoint.data?.type || 'stat',
        howWeTalkAboutThis: proofPoint.data?.howWeTalkAboutThis || [],
        whyThisMatters: proofPoint.data?.whyThisMatters || []
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
          <p className="text-fo-text-secondary">Loading proof point details...</p>
        </div>
      </div>
    );
  }

  if (error || !proofPoint) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-fo-dark mb-4">Error Loading Proof Point</h1>
          <p className="text-fo-text-secondary mb-6">{error || 'Proof point not found'}</p>
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

  const proofPointTypes = ['stat', 'fact', 'quote', 'award', 'recognition', 'other'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-fo-bg-light rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-fo-text-secondary" strokeWidth={2} />
            </button>
            <div className="flex items-center gap-3">
              <Award className="w-6 h-6 text-fo-primary" strokeWidth={2} />
              <div>
                <h1 className="text-2xl font-bold text-fo-dark">{proofPoint.name}</h1>
                {proofPoint.internalName && <p className="text-sm text-fo-text-secondary">Internal: {proofPoint.internalName}</p>}
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
                <Edit className="w-4 h-4" strokeWidth={2} />Edit Proof Point
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
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Proof point name" />
              ) : (<p className="text-fo-dark font-medium">{proofPoint.name}</p>)}
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Internal Name</label>
              {isEditing ? (
                <input type="text" value={formData.internalName} onChange={(e) => setFormData({ ...formData, internalName: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Internal name (optional)" />
              ) : proofPoint.internalName ? (<p className="text-fo-dark">{proofPoint.internalName}</p>) : (<p className="text-fo-text-secondary italic">Not specified</p>)}
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Description</label>
              {isEditing ? (
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Brief description" />
              ) : proofPoint.description ? (<p className="text-fo-dark">{proofPoint.description}</p>) : (<p className="text-fo-text-secondary italic">No description</p>)}
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Type</label>
              {isEditing ? (
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary">
                  {proofPointTypes.map(type => (<option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>))}
                </select>
              ) : (<p className="text-fo-dark capitalize">{proofPoint.data?.type || 'Not specified'}</p>)}
            </div>
          </div>
        </div>

        {renderArrayField('How We Talk About This', 'howWeTalkAboutThis', 'Talking point', proofPoint.data?.howWeTalkAboutThis)}
        {renderArrayField('Why This Matters', 'whyThisMatters', 'Reason it matters', proofPoint.data?.whyThisMatters)}

        <div className="border-t border-fo-border pt-6">
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Metadata</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {proofPoint.createdAt && (<div><p className="text-fo-text-secondary">Created</p><p className="text-fo-dark font-medium">{new Date(proofPoint.createdAt).toLocaleDateString()}</p></div>)}
            {proofPoint.updatedAt && (<div><p className="text-fo-text-secondary">Last Updated</p><p className="text-fo-dark font-medium">{new Date(proofPoint.updatedAt).toLocaleDateString()}</p></div>)}
            <div><p className="text-fo-text-secondary">Status</p><p className={`font-medium ${proofPoint.active ? 'text-green-600' : 'text-gray-500'}`}>{proofPoint.active ? 'Active' : 'Inactive'}</p></div>
            <div><p className="text-fo-text-secondary">Proof Point ID</p><p className="text-fo-dark font-mono text-xs">{proofPoint.oId}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProofPointDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-fo-primary animate-spin" strokeWidth={2} />
      </div>
    }>
      <ProofPointDetailContent />
    </Suspense>
  );
}
