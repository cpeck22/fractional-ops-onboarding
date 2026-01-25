'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { addImpersonateParam } from '@/lib/client-api-helpers';
import { ChevronLeft, ChevronRight, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { renderHighlightedContent, hasHighlights } from '@/lib/render-highlights';

export default function FinalAssetsPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [highlightsEnabled, setHighlightsEnabled] = useState(true);

  // Current step in the flow
  const [currentStep, setCurrentStep] = useState<'emails' | 'list' | 'nurture' | 'asset'>('emails');
  const [currentEmail, setCurrentEmail] = useState<'1A' | '1B' | '1C' | '2' | '3'>('1A');

  // Editable content
  const [campaignCopy, setCampaignCopy] = useState<any>({});
  const [listBuildingInstructions, setListBuildingInstructions] = useState('');
  const [nurtureSequence, setNurtureSequence] = useState('');
  const [asset, setAsset] = useState<any>({});

  useEffect(() => {
    loadCampaign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

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
        
        const finalAssets = result.campaign.finalAssets || {};
        if (finalAssets.campaignCopy) {
          setCampaignCopy(finalAssets.campaignCopy);
        }
        if (finalAssets.listBuildingInstructions) {
          setListBuildingInstructions(finalAssets.listBuildingInstructions);
        }
        if (finalAssets.nurtureSequence) {
          setNurtureSequence(finalAssets.nurtureSequence.content || finalAssets.nurtureSequence);
        }
        if (finalAssets.asset) {
          setAsset(finalAssets.asset);
        }

        // Auto-generate if not already generated
        if (result.campaign.status === 'intermediary_generated' && !finalAssets.campaignCopy) {
          generateAssets();
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

  const generateAssets = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam(`/api/client/outbound-campaigns/${campaignId}/generate-assets`, impersonateUserId);
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
        const assets = result.finalAssets;
        setCampaignCopy(assets.campaignCopy || {});
        setListBuildingInstructions(assets.listBuildingInstructions || '');
        setNurtureSequence(assets.nurtureSequence?.content || assets.nurtureSequence || '');
        setAsset(assets.asset || {});
        toast.success('Campaign assets generated!');
      } else {
        toast.error(result.error || 'Failed to generate assets');
      }
    } catch (error) {
      console.error('Error generating assets:', error);
      toast.error('Failed to generate assets');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const finalAssets = {
        campaignCopy,
        listBuildingInstructions,
        nurtureSequence: {
          content: nurtureSequence,
          highlightedContent: campaign?.finalAssets?.nurtureSequence?.highlightedContent || ''
        },
        asset
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
          finalAssets,
          status: 'assets_generated'
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Changes saved!');
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

  const nextStep = () => {
    if (currentStep === 'emails') {
      if (currentEmail === '1A') {
        setCurrentEmail('1B');
      } else if (currentEmail === '1B') {
        setCurrentEmail('1C');
      } else if (currentEmail === '1C') {
        setCurrentEmail('2');
      } else if (currentEmail === '2') {
        setCurrentEmail('3');
      } else {
        setCurrentStep('list');
      }
    } else if (currentStep === 'list') {
      setCurrentStep('nurture');
    } else if (currentStep === 'nurture') {
      setCurrentStep('asset');
    }
  };

  const prevStep = () => {
    if (currentStep === 'list') {
      setCurrentStep('emails');
      setCurrentEmail('3');
    } else if (currentStep === 'nurture') {
      setCurrentStep('list');
    } else if (currentStep === 'asset') {
      setCurrentStep('nurture');
    } else if (currentEmail === '1B') {
      setCurrentEmail('1A');
    } else if (currentEmail === '1C') {
      setCurrentEmail('1B');
    } else if (currentEmail === '2') {
      setCurrentEmail('1C');
    } else if (currentEmail === '3') {
      setCurrentEmail('2');
    }
  };

  if (loading || generating) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-fo-primary mx-auto mb-4" />
          <p className="text-fo-text-secondary">
            {generating ? 'Generating campaign assets...' : 'Loading campaign...'}
          </p>
        </div>
      </div>
    );
  }

  const currentEmailData = campaignCopy[`email${currentEmail}`] || {};
  const emailBody = highlightsEnabled && currentEmailData.highlightedBody
    ? currentEmailData.highlightedBody
    : currentEmailData.body || '';

  const backUrl = impersonateUserId
    ? `/client/outbound-campaigns/${campaignId}/intermediary?impersonate=${impersonateUserId}`
    : `/client/outbound-campaigns/${campaignId}/intermediary`;

  return (
    <div className="max-w-5xl mx-auto">
      <Link href={backUrl} className="inline-flex items-center text-fo-primary hover:text-fo-primary-dark mb-6">
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Intermediary Outputs
      </Link>

      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-8">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-fo-dark mb-2">Campaign Assets</h1>
            <p className="text-fo-text-secondary">
              Review and edit your generated campaign assets
            </p>
          </div>
          <button
            onClick={() => setHighlightsEnabled(!highlightsEnabled)}
            className="flex items-center gap-2 px-3 py-1 border border-fo-border rounded-lg text-sm hover:bg-fo-light"
          >
            {highlightsEnabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {highlightsEnabled ? 'Hide Highlights' : 'Show Highlights'}
          </button>
        </div>

        {/* Step Indicator */}
        <div className="mb-6 flex items-center gap-2 text-sm text-fo-text-secondary">
          <span className={currentStep === 'emails' ? 'text-fo-primary font-semibold' : ''}>
            Campaign Copy
          </span>
          <span>/</span>
          <span className={currentStep === 'list' ? 'text-fo-primary font-semibold' : ''}>
            List Building
          </span>
          <span>/</span>
          <span className={currentStep === 'nurture' ? 'text-fo-primary font-semibold' : ''}>
            Nurture Sequence
          </span>
          <span>/</span>
          <span className={currentStep === 'asset' ? 'text-fo-primary font-semibold' : ''}>
            Asset
          </span>
        </div>

        {/* Email Display */}
        {currentStep === 'emails' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-fo-dark">
                Email {currentEmail === '1A' || currentEmail === '1B' || currentEmail === '1C' ? `1${currentEmail}` : currentEmail}
              </h2>
            </div>

            <div>
              <label className="block text-sm font-semibold text-fo-dark mb-2">Subject Line</label>
              <input
                type="text"
                value={currentEmailData.subject || ''}
                onChange={(e) => {
                  setCampaignCopy({
                    ...campaignCopy,
                    [`email${currentEmail}`]: { ...currentEmailData, subject: e.target.value }
                  });
                }}
                className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-fo-dark mb-2">Body</label>
              {highlightsEnabled && hasHighlights(emailBody) ? (
                <div
                  className="w-full px-4 py-3 border border-fo-border rounded-lg min-h-[300px] prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderHighlightedContent(emailBody) }}
                />
              ) : (
                <textarea
                  value={currentEmailData.body || ''}
                  onChange={(e) => {
                    setCampaignCopy({
                      ...campaignCopy,
                      [`email${currentEmail}`]: { ...currentEmailData, body: e.target.value }
                    });
                  }}
                  rows={15}
                  className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent font-mono text-sm"
                />
              )}
            </div>
          </div>
        )}

        {/* List Building Instructions */}
        {currentStep === 'list' && (
          <div>
            <h2 className="text-xl font-semibold text-fo-dark mb-4">List Building Instructions</h2>
            <textarea
              value={listBuildingInstructions}
              onChange={(e) => setListBuildingInstructions(e.target.value)}
              rows={15}
              className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent"
            />
          </div>
        )}

        {/* Nurture Sequence */}
        {currentStep === 'nurture' && (
          <div>
            <h2 className="text-xl font-semibold text-fo-dark mb-4">Nurture Sequence</h2>
            {highlightsEnabled && campaign?.finalAssets?.nurtureSequence?.highlightedContent ? (
              <div
                className="w-full px-4 py-3 border border-fo-border rounded-lg min-h-[400px] prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: renderHighlightedContent(campaign.finalAssets.nurtureSequence.highlightedContent) 
                }}
              />
            ) : (
              <textarea
                value={nurtureSequence}
                onChange={(e) => setNurtureSequence(e.target.value)}
                rows={20}
                className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent font-mono text-sm"
              />
            )}
          </div>
        )}

        {/* Asset */}
        {currentStep === 'asset' && (
          <div>
            <h2 className="text-xl font-semibold text-fo-dark mb-4">Campaign Asset</h2>
            {asset.type === 'link' ? (
              <div>
                <label className="block text-sm font-semibold text-fo-dark mb-2">Asset URL</label>
                <input
                  type="url"
                  value={asset.url || ''}
                  onChange={(e) => setAsset({ ...asset, url: e.target.value })}
                  className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent"
                />
                {asset.url && (
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-fo-primary hover:underline"
                  >
                    Open asset →
                  </a>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-fo-dark mb-2">
                  {asset.type === 'lovable_prompt' ? 'Lovable Prompt' : 'Asset Description'}
                </label>
                <textarea
                  value={asset.content || ''}
                  onChange={(e) => setAsset({ ...asset, content: e.target.value })}
                  rows={15}
                  className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent font-mono text-sm"
                />
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 'emails' && currentEmail === '1A'}
            className="px-4 py-2 border border-fo-border rounded-lg text-fo-dark hover:bg-fo-light disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
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
            {currentStep !== 'asset' ? (
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary-dark flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="px-6 py-2 bg-green-600 text-white rounded-lg">
                Campaign Complete! ✓
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
