'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { addImpersonateParam } from '@/lib/client-api-helpers';
import { ChevronLeft, Loader2, Check, X } from 'lucide-react';

export default function IntermediaryOutputsPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Intermediary outputs state
  const [listBuildingStrategy, setListBuildingStrategy] = useState('');
  const [hook, setHook] = useState('');
  const [attractionOffer, setAttractionOffer] = useState({
    headline: '',
    valueBullets: [''],
    easeBullets: ['']
  });
  const [asset, setAsset] = useState({ type: 'description', content: '', url: '' });
  const [caseStudies, setCaseStudies] = useState<any[]>([]);

  const loadCampaign = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam(`/api/client/outbound-campaigns/${campaignId}`, impersonateUserId);
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });

      const result = await response.json();
      if (result.success) {
        setCampaign(result.campaign);
        
        // Load intermediary outputs if they exist
        const intermediary = result.campaign.intermediaryOutputs || {};
        if (intermediary.listBuildingStrategy) {
          setListBuildingStrategy(intermediary.listBuildingStrategy);
        }
        if (intermediary.hook) {
          setHook(intermediary.hook);
        }
        if (intermediary.attractionOffer) {
          setAttractionOffer(intermediary.attractionOffer);
        }
        if (intermediary.asset) {
          setAsset(intermediary.asset);
        }
        if (intermediary.caseStudies) {
          setCaseStudies(intermediary.caseStudies);
        }

        // Auto-generate if not already generated
        if (result.campaign.status === 'draft' && !intermediary.listBuildingStrategy) {
          generateIntermediary();
        }
      } else {
        toast.error(result.error || 'Failed to load campaign');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading campaign:', error);
      toast.error('Failed to load campaign');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const generateIntermediary = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam(`/api/client/outbound-campaigns/${campaignId}/generate-intermediary`, impersonateUserId);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        const intermediary = result.intermediaryOutputs;
        setListBuildingStrategy(intermediary.listBuildingStrategy || '');
        setHook(intermediary.hook || '');
        setAttractionOffer(intermediary.attractionOffer || { headline: '', valueBullets: [''], easeBullets: [''] });
        setAsset(intermediary.asset || { type: 'description', content: '', url: '' });
        setCaseStudies(intermediary.caseStudies || []);
        toast.success('Intermediary outputs generated! Review and edit as needed.');
      } else {
        toast.error(result.error || 'Failed to generate intermediary outputs');
      }
    } catch (error) {
      console.error('Error generating intermediary:', error);
      toast.error('Failed to generate intermediary outputs');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const intermediaryOutputs = {
        listBuildingStrategy,
        hook,
        attractionOffer,
        asset,
        caseStudies
      };

      const url = addImpersonateParam(`/api/client/outbound-campaigns/${campaignId}`, impersonateUserId);
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          intermediaryOutputs,
          status: 'intermediary_generated'
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Intermediary outputs saved!');
      } else {
        toast.error(result.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAssets = async () => {
    // Save intermediary outputs first
    await handleSave();
    
    // Now call the generate-assets API endpoint directly
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam(`/api/client/outbound-campaigns/${campaignId}/generate-assets`, impersonateUserId);
      console.log('🚀 Calling generate-assets API:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        credentials: 'include'
      });

      const result = await response.json();
      console.log('📥 Generate assets response:', result);
      
      if (result.success) {
        toast.success('Campaign assets generated! Redirecting...');
        // Small delay to ensure toast is visible, then navigate
        setTimeout(() => {
          const nextUrl = impersonateUserId
            ? `/client/outbound-campaigns/${campaignId}/assets?impersonate=${impersonateUserId}`
            : `/client/outbound-campaigns/${campaignId}/assets`;
          router.push(nextUrl);
        }, 500);
      } else {
        toast.error(result.error || result.details || 'Failed to generate assets');
        setGenerating(false);
      }
    } catch (error: any) {
      console.error('❌ Error generating assets:', error);
      toast.error(`Failed to generate assets: ${error.message}`);
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-fo-primary mx-auto mb-4" />
          <p className="text-fo-text-secondary">Loading campaign...</p>
        </div>
      </div>
    );
  }

  const backUrl = impersonateUserId
    ? `/client/outbound-campaigns/new?impersonate=${impersonateUserId}`
    : '/client/outbound-campaigns/new';

  return (
    <div className="max-w-5xl mx-auto">
      {/* Loading Modal Overlay */}
      {generating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4 text-center">
            <Loader2 className="w-16 h-16 animate-spin text-fo-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-fo-dark mb-2">Claire is writing your intermediary campaign assets</h2>
            <p className="text-fo-text-secondary">Please give her a minute...</p>
          </div>
        </div>
      )}
      <Link href={backUrl} className="inline-flex items-center text-fo-primary hover:text-fo-primary-dark mb-6">
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back
      </Link>

      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-fo-dark mb-2">Intermediary Campaign Elements</h1>
          <p className="text-fo-text-secondary">
            Review and edit the pre-filled campaign elements below. These will be used to generate your final campaign assets.
          </p>
        </div>

        <div className="space-y-8">
          {/* List Building Strategy */}
          <div>
            <label className="block text-sm font-semibold text-fo-dark mb-2">
              1. List Building Strategy
            </label>
            <textarea
              value={listBuildingStrategy}
              onChange={(e) => setListBuildingStrategy(e.target.value)}
              placeholder="Description of accounts and prospects to reach out to..."
              rows={6}
              className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent"
            />
          </div>

          {/* Hook */}
          <div>
            <label className="block text-sm font-semibold text-fo-dark mb-2">
              2. Hook (Shared Touchpoint)
            </label>
            <textarea
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder="The shared touchpoint hook that builds trust immediately..."
              rows={3}
              className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent"
            />
          </div>

          {/* Attraction Offer */}
          <div>
            <label className="block text-sm font-semibold text-fo-dark mb-2">
              3. Attraction Offer
            </label>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-fo-text-secondary mb-1">Headline</label>
                <input
                  type="text"
                  value={attractionOffer.headline}
                  onChange={(e) => setAttractionOffer({ ...attractionOffer, headline: e.target.value })}
                  placeholder="e.g., Free Innovation Assessment"
                  className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-fo-text-secondary mb-1">Value Bullets</label>
                {attractionOffer.valueBullets.map((bullet, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={bullet}
                      onChange={(e) => {
                        const newBullets = [...attractionOffer.valueBullets];
                        newBullets[idx] = e.target.value;
                        setAttractionOffer({ ...attractionOffer, valueBullets: newBullets });
                      }}
                      placeholder={`Value point ${idx + 1}`}
                      className="flex-1 px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent"
                    />
                    {attractionOffer.valueBullets.length > 1 && (
                      <button
                        onClick={() => {
                          const newBullets = attractionOffer.valueBullets.filter((_, i) => i !== idx);
                          setAttractionOffer({ ...attractionOffer, valueBullets: newBullets });
                        }}
                        className="px-3 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setAttractionOffer({ ...attractionOffer, valueBullets: [...attractionOffer.valueBullets, ''] })}
                  className="text-sm text-fo-primary hover:text-fo-primary-dark"
                >
                  + Add Value Bullet
                </button>
              </div>
              <div>
                <label className="block text-xs text-fo-text-secondary mb-1">Ease Bullets</label>
                {attractionOffer.easeBullets.map((bullet, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={bullet}
                      onChange={(e) => {
                        const newBullets = [...attractionOffer.easeBullets];
                        newBullets[idx] = e.target.value;
                        setAttractionOffer({ ...attractionOffer, easeBullets: newBullets });
                      }}
                      placeholder={`Ease point ${idx + 1}`}
                      className="flex-1 px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent"
                    />
                    {attractionOffer.easeBullets.length > 1 && (
                      <button
                        onClick={() => {
                          const newBullets = attractionOffer.easeBullets.filter((_, i) => i !== idx);
                          setAttractionOffer({ ...attractionOffer, easeBullets: newBullets });
                        }}
                        className="px-3 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setAttractionOffer({ ...attractionOffer, easeBullets: [...attractionOffer.easeBullets, ''] })}
                  className="text-sm text-fo-primary hover:text-fo-primary-dark"
                >
                  + Add Ease Bullet
                </button>
              </div>
            </div>
          </div>

          {/* Asset */}
          <div>
            <label className="block text-sm font-semibold text-fo-dark mb-2">
              4. Asset (Landing Page, Blog Post, Tool, etc.)
            </label>
            {asset.type === 'link' ? (
              <div className="space-y-2">
                <input
                  type="url"
                  value={asset.url}
                  onChange={(e) => setAsset({ ...asset, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent"
                />
                <button
                  onClick={() => setAsset({ type: 'description', content: '', url: '' })}
                  className="text-sm text-fo-text-secondary hover:text-fo-dark"
                >
                  Switch to description or Lovable prompt
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={asset.content}
                  onChange={(e) => setAsset({ ...asset, content: e.target.value })}
                  placeholder="Asset description or Lovable prompt..."
                  rows={4}
                  className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent"
                />
                <button
                  onClick={() => setAsset({ type: 'link', content: '', url: '' })}
                  className="text-sm text-fo-text-secondary hover:text-fo-dark"
                >
                  Switch to URL link
                </button>
              </div>
            )}
          </div>

          {/* Case Studies */}
          <div>
            <label className="block text-sm font-semibold text-fo-dark mb-2">
              5. Case Studies (Optional)
            </label>
            {caseStudies.map((study, idx) => (
              <div key={idx} className="border border-fo-border rounded-lg p-4 mb-4">
                <div className="flex justify-between items-start mb-3">
                  <input
                    type="text"
                    value={study.clientName || ''}
                    onChange={(e) => {
                      const newStudies = [...caseStudies];
                      newStudies[idx] = { ...study, clientName: e.target.value };
                      setCaseStudies(newStudies);
                    }}
                    placeholder="Client name"
                    className="flex-1 px-3 py-1 border border-fo-border rounded mr-2"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={study.canNameDrop !== false}
                      onChange={(e) => {
                        const newStudies = [...caseStudies];
                        newStudies[idx] = { ...study, canNameDrop: e.target.checked };
                        setCaseStudies(newStudies);
                      }}
                      className="rounded"
                    />
                    Can name-drop
                  </label>
                  <button
                    onClick={() => setCaseStudies(caseStudies.filter((_, i) => i !== idx))}
                    className="text-red-500 hover:bg-red-50 px-2 py-1 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  value={study.description || ''}
                  onChange={(e) => {
                    const newStudies = [...caseStudies];
                    newStudies[idx] = { ...study, description: e.target.value };
                    setCaseStudies(newStudies);
                  }}
                  placeholder="Case study description with results, statistics, testimonials..."
                  rows={4}
                  className="w-full px-3 py-2 border border-fo-border rounded-lg"
                />
              </div>
            ))}
            <button
              onClick={() => setCaseStudies([...caseStudies, { clientName: '', canNameDrop: true, description: '', results: '' }])}
              className="text-sm text-fo-primary hover:text-fo-primary-dark"
            >
              + Add Case Study
            </button>
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <button
            onClick={generateIntermediary}
            disabled={generating}
            className="px-4 py-2 border border-fo-border rounded-lg text-fo-dark hover:bg-fo-light disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              'Regenerate All'
            )}
          </button>
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 border border-fo-border rounded-lg text-fo-dark hover:bg-fo-light disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save
                </>
              )}
            </button>
            <button
              onClick={handleGenerateAssets}
              disabled={saving || generating}
              className="px-6 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary-dark disabled:opacity-50 flex items-center gap-2"
            >
              Generate Campaign Assets
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
