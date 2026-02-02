'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { BookOpen, Loader2, ArrowLeft, Edit, Save, X, AlertCircle, Eye, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function PlaybookDetailContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const playbookOId = params.oId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playbook, setPlaybook] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available entities for dropdowns
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
    keyInsight: [] as string[],
    exampleDomains: [] as string[],
    approachAngle: [] as string[],
    strategicNarrative: [] as string[],
    selectedPersonaOIds: [] as string[],
    selectedUseCaseOIds: [] as string[],
    selectedReferenceOIds: [] as string[],
    selectedSegmentOId: '',
    selectedCompetitorOId: '',
    selectedProofPointOIds: [] as string[],
    productOId: ''
  });

  useEffect(() => { loadPlaybookAndEntities(); }, [playbookOId, impersonateUserId]);

  const loadPlaybookAndEntities = async () => {
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
      if (!response.ok) throw new Error('Failed to load playbook data');

      const result = await response.json();
      const found = result.playbooks?.find((p: any) => p.oId === playbookOId);
      if (!found) throw new Error('Playbook not found');

      // Store all entities for dropdowns
      setAllPersonas(result.personas || []);
      setAllUseCases(result.useCases || []);
      setAllReferences(result.clientReferences || []);
      setAllSegments(result.segments || []);
      setAllCompetitors(result.competitors || []);
      setAllProofPoints(result.proofPoints || []);
      setAllProducts(result.services || []);

      setPlaybook(found);
      setFormData({
        name: found.name || '',
        description: found.description || '',
        type: found.type || '',
        status: found.status || 'active',
        keyInsight: found.data?.keyInsight || [],
        exampleDomains: found.data?.exampleDomains || [],
        approachAngle: found.data?.approachAngle || [],
        strategicNarrative: found.data?.strategicNarrative || [],
        selectedPersonaOIds: found.buyerPersonas?.map((p: any) => p.oId) || [],
        selectedUseCaseOIds: found.useCases?.map((uc: any) => uc.oId) || [],
        selectedReferenceOIds: found.references?.map((r: any) => r.oId) || [],
        selectedSegmentOId: found.segment?.oId || '',
        selectedCompetitorOId: found.competitor?.oId || '',
        selectedProofPointOIds: found.proofPoints?.map((pp: any) => pp.oId) || [],
        productOId: found.product?.oId || ''
      });
    } catch (err: any) {
      console.error('Error loading playbook:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!formData.description.trim()) { toast.error('Playbook description is required'); return; }
      if (formData.keyInsight.length === 0 || !formData.keyInsight[0]?.trim()) { toast.error('Key insight is required'); return; }

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      if (!authToken) throw new Error('Authentication required');

      const url = impersonateUserId ? `/api/client/gtm-strategy/playbooks?impersonate=${impersonateUserId}` : '/api/client/gtm-strategy/playbooks';
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ oId: playbookOId, ...formData })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save playbook');
      }

      toast.success('Playbook updated successfully');
      setIsEditing(false);
      await loadPlaybookAndEntities();
    } catch (err: any) {
      console.error('Error saving playbook:', err);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (playbook) {
      setFormData({
        name: playbook.name || '',
        description: playbook.description || '',
        type: playbook.type || '',
        status: playbook.status || 'active',
        keyInsight: playbook.data?.keyInsight || [],
        exampleDomains: playbook.data?.exampleDomains || [],
        approachAngle: playbook.data?.approachAngle || [],
        strategicNarrative: playbook.data?.strategicNarrative || [],
        selectedPersonaOIds: playbook.buyerPersonas?.map((p: any) => p.oId) || [],
        selectedUseCaseOIds: playbook.useCases?.map((uc: any) => uc.oId) || [],
        selectedReferenceOIds: playbook.references?.map((r: any) => r.oId) || [],
        selectedSegmentOId: playbook.segment?.oId || '',
        selectedCompetitorOId: playbook.competitor?.oId || '',
        selectedProofPointOIds: playbook.proofPoints?.map((pp: any) => pp.oId) || [],
        productOId: playbook.product?.oId || ''
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

  const toggleMultiSelect = (field: string, oId: string) => {
    setFormData(prev => {
      const current = prev[field as keyof typeof prev] as string[];
      const isSelected = current.includes(oId);
      return {
        ...prev,
        [field]: isSelected ? current.filter(id => id !== oId) : [...current, oId]
      };
    });
  };

  const handleViewDetails = (entityType: string, oId: string) => {
    const url = impersonateUserId
      ? `/client/gtm-strategy/${entityType}/${oId}?impersonate=${impersonateUserId}`
      : `/client/gtm-strategy/${entityType}/${oId}`;
    router.push(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-fo-primary animate-spin mx-auto mb-4" strokeWidth={2} />
          <p className="text-fo-text-secondary">Loading playbook details...</p>
        </div>
      </div>
    );
  }

  if (error || !playbook) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-fo-dark mb-4">Error Loading Playbook</h1>
          <p className="text-fo-text-secondary mb-6">{error || 'Playbook not found'}</p>
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

  const renderMultiSelectDropdown = (title: string, field: string, entities: any[], entityType: string) => {
    const selectedOIds = formData[field as keyof typeof formData] as string[];
    const selectedEntities = entities.filter(e => selectedOIds.includes(e.oId));
    
    return (
      <div>
        <h2 className="text-lg font-semibold text-fo-dark mb-4">{title}</h2>
        {isEditing ? (
          <div className="space-y-2">
            <div className="border border-fo-border rounded-lg p-3 max-h-48 overflow-y-auto">
              {entities.length === 0 ? (
                <p className="text-fo-text-secondary text-sm">No {title.toLowerCase()} available</p>
              ) : (
                entities.map(entity => (
                  <label key={entity.oId} className="flex items-center gap-2 p-2 hover:bg-fo-bg-light rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedOIds.includes(entity.oId)}
                      onChange={() => toggleMultiSelect(field, entity.oId)}
                      className="w-4 h-4 text-fo-primary rounded"
                    />
                    <span className="text-sm text-fo-dark">{entity.name}</span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-fo-text-secondary">{selectedOIds.length} selected</p>
          </div>
        ) : selectedEntities.length > 0 ? (
          <div className="space-y-2">
            {selectedEntities.map(entity => (
              <div key={entity.oId} className="flex items-center justify-between bg-fo-bg-light p-3 rounded-lg">
                <span className="text-fo-dark">{entity.name}</span>
                <button onClick={() => handleViewDetails(entityType, entity.oId)} className="flex items-center gap-1 text-sm text-fo-primary hover:text-fo-primary/80 font-semibold">
                  <Eye className="w-4 h-4" strokeWidth={2} />
                  View Details
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-fo-text-secondary italic">No {title.toLowerCase()} linked</p>
        )}
      </div>
    );
  };

  const renderSingleSelectDropdown = (title: string, field: string, entities: any[], entityType: string) => {
    const selectedOId = formData[field as keyof typeof formData] as string;
    const selectedEntity = entities.find(e => e.oId === selectedOId);
    
    return (
      <div>
        <h2 className="text-lg font-semibold text-fo-dark mb-4">{title}</h2>
        {isEditing ? (
          <select 
            value={selectedOId} 
            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })} 
            className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
          >
            <option value="">None selected</option>
            {entities.map(entity => (
              <option key={entity.oId} value={entity.oId}>{entity.name}</option>
            ))}
          </select>
        ) : selectedEntity ? (
          <div className="flex items-center justify-between bg-fo-bg-light p-3 rounded-lg">
            <span className="text-fo-dark">{selectedEntity.name}</span>
            <button onClick={() => handleViewDetails(entityType, selectedEntity.oId)} className="flex items-center gap-1 text-sm text-fo-primary hover:text-fo-primary/80 font-semibold">
              <Eye className="w-4 h-4" strokeWidth={2} />
              View Details
            </button>
          </div>
        ) : (
          <p className="text-fo-text-secondary italic">No {title.toLowerCase()} selected</p>
        )}
      </div>
    );
  };

  const playbookTypes = ['LEGACY', 'SECTOR', 'SOLUTION', 'MILESTONE', 'PRACTITIONER', 'COMPETITIVE', 'ACCOUNT', 'CUSTOM'];
  const statusOptions = ['active', 'draft', 'archived'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-fo-bg-light rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-fo-text-secondary" strokeWidth={2} />
            </button>
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-fo-primary" strokeWidth={2} />
              <div>
                <h1 className="text-2xl font-bold text-fo-dark">{playbook.name || 'Unnamed Playbook'}</h1>
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
                <Edit className="w-4 h-4" strokeWidth={2} />Edit Playbook
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Name</label>
              {isEditing ? (
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Playbook name (optional)" />
              ) : playbook.name ? (<p className="text-fo-dark font-medium">{playbook.name}</p>) : (<p className="text-fo-text-secondary italic">Not specified</p>)}
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Description <span className="text-red-500">*</span></label>
              {isEditing ? (
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="Briefly describe the type of company, vertical, or industry you're targeting." />
              ) : playbook.description ? (<p className="text-fo-dark">{playbook.description}</p>) : (<p className="text-fo-text-secondary italic">No description</p>)}
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Type</label>
              {isEditing ? (
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary">
                  <option value="">Select type (optional)</option>
                  {playbookTypes.map(type => (<option key={type} value={type}>{type}</option>))}
                </select>
              ) : playbook.type ? (<p className="text-fo-dark">{playbook.type}</p>) : (<p className="text-fo-text-secondary italic">Not specified</p>)}
            </div>
            <div>
              <label className="block text-sm font-semibold text-fo-text-secondary mb-1">Status</label>
              {isEditing ? (
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary">
                  {statusOptions.map(status => (<option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>))}
                </select>
              ) : (<p className="text-fo-dark capitalize">{playbook.status || 'active'}</p>)}
            </div>
          </div>
        </div>

        {/* Key Insight */}
        <div>
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Key Insight <span className="text-red-500">*</span></h2>
          {isEditing ? (
            <div className="space-y-2">
              {formData.keyInsight.map((insight, index) => (
                <div key={index} className="flex gap-2">
                  <textarea value={insight} onChange={(e) => handleArrayFieldChange('keyInsight', index, e.target.value)} rows={2} className="flex-1 px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary" placeholder="What about your offering is unique or specifically relevant to this type of company, vertical, or industry?" />
                  <button onClick={() => handleRemoveArrayItem('keyInsight', index)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">Remove</button>
                </div>
              ))}
              <button onClick={() => handleAddArrayItem('keyInsight')} className="px-4 py-2 text-fo-primary border border-fo-primary rounded-lg hover:bg-fo-light transition-colors">+ Add Insight</button>
            </div>
          ) : playbook.data?.keyInsight && playbook.data.keyInsight.length > 0 ? (
            <ul className="list-disc list-inside space-y-2 bg-fo-bg-light p-4 rounded-lg">
              {playbook.data.keyInsight.map((item: string, idx: number) => (<li key={idx} className="text-fo-dark">{item}</li>))}
            </ul>
          ) : (<p className="text-fo-text-secondary italic">No key insights listed</p>)}
        </div>

        {/* Relationships */}
        {renderSingleSelectDropdown('Product/Service', 'productOId', allProducts, 'services')}
        {renderMultiSelectDropdown('Buyer Personas', 'selectedPersonaOIds', allPersonas, 'personas')}
        {renderMultiSelectDropdown('Use Cases', 'selectedUseCaseOIds', allUseCases, 'use-cases')}
        {renderMultiSelectDropdown('References', 'selectedReferenceOIds', allReferences, 'references')}
        {renderSingleSelectDropdown('Segment', 'selectedSegmentOId', allSegments, 'segments')}
        {renderSingleSelectDropdown('Competitor', 'selectedCompetitorOId', allCompetitors, 'competitors')}
        {renderMultiSelectDropdown('Proof Points', 'selectedProofPointOIds', allProofPoints, 'proof-points')}

        {/* Strategy Fields */}
        {renderArrayField('Example Domains', 'exampleDomains', 'example.com', playbook.data?.exampleDomains)}
        {renderArrayField('Approach Angle', 'approachAngle', 'Approach angle', playbook.data?.approachAngle)}
        {renderArrayField('Strategic Narrative', 'strategicNarrative', 'Narrative element', playbook.data?.strategicNarrative)}

        {/* Qualifying Questions */}
        {playbook.qualifyingQuestions && playbook.qualifyingQuestions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-fo-dark mb-4">Qualifying Questions</h2>
            <div className="space-y-4">
              {playbook.qualifyingQuestions.map((q: any, idx: number) => (
                <div key={idx} className="bg-fo-bg-light p-4 rounded-lg">
                  <p className="font-semibold text-fo-dark mb-2">{q.question}</p>
                  <p className="text-sm text-fo-text-secondary mb-2">Rationale: {q.rationale}</p>
                  <div className="flex gap-3 text-xs">
                    <span className={`px-2 py-1 rounded ${q.fitType === 'GOOD' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{q.fitType}</span>
                    <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">{q.weight}</span>
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
            {playbook.createdAt && (<div><p className="text-fo-text-secondary">Created</p><p className="text-fo-dark font-medium">{new Date(playbook.createdAt).toLocaleDateString()}</p></div>)}
            {playbook.updatedAt && (<div><p className="text-fo-text-secondary">Last Updated</p><p className="text-fo-dark font-medium">{new Date(playbook.updatedAt).toLocaleDateString()}</p></div>)}
            <div><p className="text-fo-text-secondary">Status</p><p className={`font-medium ${playbook.active ? 'text-green-600' : 'text-gray-500'}`}>{playbook.active ? 'Active' : 'Inactive'}</p></div>
            <div><p className="text-fo-text-secondary">Shared</p><p className="text-fo-dark">{playbook.shared ? 'Yes' : 'No'}</p></div>
            <div><p className="text-fo-text-secondary">Playbook ID</p><p className="text-fo-dark font-mono text-xs">{playbook.oId}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlaybookDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-fo-primary animate-spin" strokeWidth={2} />
      </div>
    }>
      <PlaybookDetailContent />
    </Suspense>
  );
}
