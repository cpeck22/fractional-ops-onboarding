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

  const loadCampaign = async () => {
    try {
      console.log('TESTING LOGS BELOW');
      console.log('🔄 Frontend: loadCampaign called', { campaignId, impersonateUserId });
      
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      console.log('🔐 Frontend: Auth session:', { hasSession: !!session, hasToken: !!authToken });

      const url = addImpersonateParam(`/api/client/outbound-campaigns/${campaignId}?t=${Date.now()}`, impersonateUserId);
      console.log('🌐 Frontend: Fetching from URL:', url);
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });

      console.log('📡 Frontend: Fetch response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      const result = await response.json();
      console.log('📥 Frontend: Load campaign response:', {
        success: result.success,
        hasCampaign: !!result.campaign,
        campaignStatus: result.campaign?.status,
        hasFinalAssets: !!result.campaign?.finalAssets,
        finalAssetsType: typeof result.campaign?.finalAssets,
        finalAssetsIsNull: result.campaign?.finalAssets === null,
        finalAssetsIsUndefined: result.campaign?.finalAssets === undefined,
        fullResponse: JSON.stringify(result).substring(0, 1000)
      });
      console.log('📥 Frontend: FULL RESPONSE OBJECT:', result);
      console.log('📥 Frontend: result.campaign:', result.campaign);
      console.log('📥 Frontend: result.campaign.finalAssets:', result.campaign?.finalAssets);
      console.log('📥 Frontend: result.campaign.finalAssets stringified:', JSON.stringify(result.campaign?.finalAssets));
      
      if (result.success) {
        setCampaign(result.campaign);
        
        const finalAssets = result.campaign.finalAssets || {};
        console.log('📦 Frontend: Final assets from campaign:', {
          campaignCopyKeys: finalAssets.campaignCopy ? Object.keys(finalAssets.campaignCopy) : 'none',
          hasListBuilding: !!finalAssets.listBuildingInstructions,
          listBuildingLength: finalAssets.listBuildingInstructions?.length || 0,
          hasNurture: !!finalAssets.nurtureSequence,
          nurtureType: typeof finalAssets.nurtureSequence,
          hasNurtureContent: !!finalAssets.nurtureSequence?.content,
          nurtureContentLength: finalAssets.nurtureSequence?.content?.length || 0,
          hasAsset: !!finalAssets.asset,
          assetType: finalAssets.asset?.type,
          status: result.campaign.status,
          finalAssetsExists: !!result.campaign.finalAssets,
          finalAssetsType: typeof result.campaign.finalAssets,
          finalAssetsKeys: result.campaign.finalAssets ? Object.keys(result.campaign.finalAssets) : [],
          campaignCopySample: finalAssets.campaignCopy ? finalAssets.campaignCopy.email1A : 'none',
          finalAssetsStringified: JSON.stringify(finalAssets).substring(0, 1000)
        });
        
        // Always set state, even if empty, to ensure UI reflects current state
        if (finalAssets.campaignCopy && Object.keys(finalAssets.campaignCopy).length > 0) {
          console.log('✅ Frontend: Setting campaign copy:', Object.keys(finalAssets.campaignCopy));
          console.log('📧 Frontend: Sample email1A:', JSON.stringify(finalAssets.campaignCopy.email1A, null, 2));
          console.log('📧 Frontend: Full campaignCopy structure:', JSON.stringify(finalAssets.campaignCopy, null, 2));
          // Ensure we're setting the exact structure from the database
          // Force a new object reference to ensure React detects the change
          const campaignCopyToSet = { ...finalAssets.campaignCopy };
          console.log('📧 Frontend: About to set campaignCopy state with:', {
            keys: Object.keys(campaignCopyToSet),
            email1A: campaignCopyToSet.email1A ? {
              hasSubject: !!campaignCopyToSet.email1A.subject,
              subjectLength: campaignCopyToSet.email1A.subject?.length || 0,
              hasBody: !!campaignCopyToSet.email1A.body,
              bodyLength: campaignCopyToSet.email1A.body?.length || 0
            } : null
          });
          setCampaignCopy(campaignCopyToSet);
          console.log('✅ Frontend: campaignCopy state set');
        } else {
          console.warn('⚠️ Frontend: No campaign copy found in finalAssets');
          console.warn('⚠️ Frontend: finalAssets structure:', JSON.stringify(finalAssets, null, 2));
          // Set empty structure to ensure UI doesn't break
          setCampaignCopy({});
        }
        if (finalAssets.listBuildingInstructions) {
          console.log('✅ Frontend: Setting list building instructions, length:', finalAssets.listBuildingInstructions.length);
          setListBuildingInstructions(finalAssets.listBuildingInstructions);
        } else {
          console.warn('⚠️ Frontend: No list building instructions found');
          setListBuildingInstructions('');
        }
        if (finalAssets.nurtureSequence) {
          console.log('✅ Frontend: Setting nurture sequence');
          const nurtureContent = finalAssets.nurtureSequence.content || finalAssets.nurtureSequence;
          console.log('📧 Frontend: Nurture content type:', typeof nurtureContent, 'length:', nurtureContent?.length || 0);
          setNurtureSequence(nurtureContent);
        } else {
          console.warn('⚠️ Frontend: No nurture sequence found');
          setNurtureSequence('');
        }
        if (finalAssets.asset) {
          console.log('✅ Frontend: Setting asset:', finalAssets.asset.type);
          setAsset(finalAssets.asset);
        } else {
          console.warn('⚠️ Frontend: No asset found, setting default');
          setAsset({ type: 'description', content: '', url: '' });
        }

        // Auto-generate if not already generated
        if (result.campaign.status === 'intermediary_generated' && !finalAssets.campaignCopy) {
          console.log('🔄 Auto-generating assets...');
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

  useEffect(() => {
    loadCampaign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  // Reload campaign if finalAssets are missing but status indicates they should exist
  useEffect(() => {
    if (campaign && campaign.status === 'assets_generated' && !campaign.finalAssets?.campaignCopy) {
      console.log('🔄 Final assets missing but status is assets_generated, reloading...');
      // Wait a bit then reload to ensure database has updated
      const timer = setTimeout(() => {
        loadCampaign();
      }, 1000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign]);

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
      console.log('📥 Generate assets response:', result);
      
      if (result.success) {
        const assets = result.finalAssets;
        console.log('📦 Received assets:', {
          campaignCopyKeys: assets.campaignCopy ? Object.keys(assets.campaignCopy) : 'none',
          hasListBuilding: !!assets.listBuildingInstructions,
          hasNurture: !!assets.nurtureSequence,
          hasAsset: !!assets.asset
        });
        
        // Ensure we have campaign copy before setting state
        console.log('📦 Setting assets from generateAssets response:', {
          campaignCopyKeys: assets.campaignCopy ? Object.keys(assets.campaignCopy) : 'none',
          email1ASample: assets.campaignCopy?.email1A
        });
        
        if (assets.campaignCopy && Object.keys(assets.campaignCopy).length > 0) {
          console.log('✅ Setting campaign copy state:', Object.keys(assets.campaignCopy));
          setCampaignCopy(assets.campaignCopy);
        } else {
          console.error('❌ No campaign copy in assets response!');
        }
        if (assets.listBuildingInstructions) {
          setListBuildingInstructions(assets.listBuildingInstructions);
        }
        if (assets.nurtureSequence) {
          setNurtureSequence(assets.nurtureSequence.content || assets.nurtureSequence);
        }
        if (assets.asset) {
          setAsset(assets.asset);
        }
        
        // Update campaign state to reflect new assets
        setCampaign((prev: any) => ({
          ...prev,
          finalAssets: assets,
          status: 'assets_generated'
        }));
        
        toast.success('Campaign assets generated!');
      } else {
        console.error('❌ Generate assets failed:', result);
        toast.error(result.error || result.details || 'Failed to generate assets');
      }
    } catch (error: any) {
      console.error('❌ Error generating assets:', error);
      console.error('Error details:', error.message, error.stack);
      toast.error(`Failed to generate assets: ${error.message}`);
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

  const currentEmailData = campaignCopy[`email${currentEmail}`] || {};
  const emailBody = highlightsEnabled && currentEmailData.highlightedBody
    ? currentEmailData.highlightedBody
    : currentEmailData.body || '';
  
  // Debug logging for email data (must be before early return)
  useEffect(() => {
    const emailData = campaignCopy[`email${currentEmail}`] || {};
    console.log('📧 Current email data check:', {
      currentEmail,
      emailKey: `email${currentEmail}`,
      hasEmailData: !!campaignCopy[`email${currentEmail}`],
      emailData: campaignCopy[`email${currentEmail}`],
      campaignCopyKeys: Object.keys(campaignCopy),
      hasSubject: !!emailData.subject,
      hasBody: !!emailData.body
    });
  }, [currentEmail, campaignCopy]);

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
                Email {currentEmail === '1A' || currentEmail === '1B' || currentEmail === '1C' ? currentEmail : currentEmail}
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
