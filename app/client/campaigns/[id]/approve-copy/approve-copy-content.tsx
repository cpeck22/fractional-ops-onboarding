'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { addImpersonateParam } from '@/lib/client-api-helpers';
import { Loader2, CheckCircle, AlertTriangle, Mail } from 'lucide-react';
import { renderHighlightedContent } from '@/lib/render-highlights';

export default function ApproveCopyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const impersonateUserId = searchParams.get('impersonate');
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<any>(null);
  const [editedCopy, setEditedCopy] = useState('');
  const [emailSequence, setEmailSequence] = useState<any[]>([]);
  const [isSequenceAgent, setIsSequenceAgent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [showHighlights, setShowHighlights] = useState(true);

  useEffect(() => {
    loadCampaign();
  }, [campaignId, impersonateUserId]);

  const loadCampaign = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      const effectiveUserId = impersonateUserId || session?.user?.id;

      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: campaignData, error } = await supabaseAdmin
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('user_id', effectiveUserId)
        .single();

      if (error || !campaignData) {
        toast.error('Campaign not found');
        setLoading(false);
        return;
      }

      setCampaign(campaignData);
      setEditedCopy(campaignData.final_outputs?.raw_content || '');
      
      // Check if this is a sequence agent
      if (campaignData.final_outputs?.campaign_copy?.emails) {
        setIsSequenceAgent(true);
        setEmailSequence(campaignData.final_outputs.campaign_copy.emails);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading campaign:', error);
      toast.error('Failed to load campaign');
      setLoading(false);
    }
  };

  const handleApproveCopy = async () => {
    if (!editedCopy.trim()) {
      toast.error('Copy cannot be empty');
      return;
    }

    // Validate placeholders
    const requiredPlaceholders = ['{{first_name}}', '{{company_name}}', '%signature%'];
    const missingPlaceholders = requiredPlaceholders.filter(p => !editedCopy.includes(p));

    if (missingPlaceholders.length > 0) {
      const proceed = window.confirm(
        `Warning: The following placeholders are missing:\n${missingPlaceholders.join(', ')}\n\nDo you want to continue anyway?`
      );
      if (!proceed) return;
    }

    setApproving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam(`/api/client/campaigns/${campaignId}/approve-copy`, impersonateUserId);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          edited_copy: editedCopy
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Campaign approved! Status: Launch Approved');
        // Redirect to campaigns list
        router.push(impersonateUserId ? `/client/campaigns?impersonate=${impersonateUserId}` : '/client/campaigns');
      } else {
        toast.error(result.error || 'Failed to approve copy');
      }
      setApproving(false);
    } catch (error) {
      console.error('Error approving copy:', error);
      toast.error('Failed to approve copy');
      setApproving(false);
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

  if (!campaign) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-fo-border p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-fo-text-secondary text-lg">Campaign not found</p>
        </div>
      </div>
    );
  }

  const intermediary = campaign.intermediary_outputs || {};
  const finalOutputs = campaign.final_outputs || {};

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-fo-dark mb-2">Approve Campaign Copy</h1>
        <p className="text-fo-text-secondary">
          Campaign: <span className="font-semibold">{campaign.campaign_name}</span> | Play: {campaign.play_code}
        </p>
      </div>

      {/* Campaign Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6 mb-6">
        <h2 className="text-xl font-semibold text-fo-dark mb-4">Campaign Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold text-fo-dark">Type:</span> {campaign.campaign_type || 'N/A'}
          </div>
          <div>
            <span className="font-semibold text-fo-dark">Sender:</span> {campaign.additional_constraints?.sender_name || 'Default'}
          </div>
          <div className="col-span-2">
            <span className="font-semibold text-fo-dark">Hook:</span> {intermediary.hook || 'N/A'}
          </div>
          <div className="col-span-2">
            <span className="font-semibold text-fo-dark">Offer:</span> {intermediary.attraction_offer?.headline || 'N/A'}
          </div>
        </div>
      </div>

      {/* Copy Editor */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-fo-dark">Campaign Copy</h2>
          <button
            onClick={() => setShowHighlights(!showHighlights)}
            className="text-sm text-fo-primary hover:text-fo-primary-dark font-medium"
          >
            {showHighlights ? 'Hide' : 'Show'} Highlights
          </button>
        </div>

        <p className="text-sm text-fo-text-secondary mb-4">
          Edit the copy as needed. Keep placeholders like {`{{first_name}}`}, {`{{company_name}}`}, and %signature% intact.
        </p>

        {/* Highlight Legend */}
        {showHighlights && (
          <div className="border border-fo-border rounded-lg p-4 bg-fo-light mb-4">
            <h4 className="text-sm font-semibold text-fo-dark mb-3">Highlight Legend:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="bg-highlight-persona px-2 py-1 rounded font-semibold">Persona</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-highlight-outcome px-2 py-1 rounded font-semibold">Use Case</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-highlight-blocker px-2 py-1 rounded font-semibold">Problem</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-highlight-cta px-2 py-1 rounded font-semibold">CTA</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-highlight-resource px-2 py-1 rounded font-semibold">Resource</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-highlight-personalized px-2 py-1 rounded font-semibold">Personalization</span>
              </div>
            </div>
          </div>
        )}

        {/* Email Sequence Display (for SEQUENCE agents) */}
        {isSequenceAgent && emailSequence.length > 0 && showHighlights && (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">📧 Email Sequence</span> - {emailSequence.length} emails in this campaign
              </p>
            </div>

            <div className="space-y-4">
              {emailSequence.map((email: any, index: number) => (
                <div key={index} className="border border-fo-border rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-fo-primary to-indigo-600 text-white px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5" />
                      <span className="font-semibold">Email {index + 1} of {emailSequence.length}</span>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-white">
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-fo-text-secondary uppercase tracking-wide mb-2">Subject Line</label>
                      <p className="text-base font-semibold text-fo-dark bg-amber-50 border border-amber-200 px-4 py-2 rounded">
                        {email.subject}
                      </p>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {email.sections?.greeting && <p>{email.sections.greeting}</p>}
                      {email.sections?.opening && <p>{email.sections.opening}</p>}
                      {email.sections?.body && <p className="whitespace-pre-wrap">{email.sections.body}</p>}
                      {email.sections?.closing && <p>{email.sections.closing}</p>}
                      {email.sections?.cta && <p className="font-semibold">{email.sections.cta}</p>}
                      {email.sections?.ps && <p className="italic">{email.sections.ps}</p>}
                      {email.sections?.signature && <p className="mt-4">{email.sections.signature}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Highlighted Preview (full sequence with highlights) */}
        {showHighlights && finalOutputs.highlighted_html && (
          <div className="mb-4 border border-fo-border rounded-lg p-4 bg-fo-light max-h-96 overflow-y-auto">
            <h4 className="text-sm font-semibold text-fo-dark mb-2">
              {isSequenceAgent ? 'Full Sequence with Highlights:' : 'Highlighted Preview:'}
            </h4>
            <div 
              className="text-sm text-fo-text whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: renderHighlightedContent(finalOutputs.highlighted_html) }}
            />
          </div>
        )}

        {/* Editable Copy */}
        <div>
          <label className="block text-sm font-semibold text-fo-dark mb-2">
            {isSequenceAgent ? 'Full Sequence (Editable)' : 'Campaign Copy (Editable)'}
          </label>
          {isSequenceAgent && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-2">
              ⚠️ Keep email separators (━━━━ EMAIL X OF Y ━━━━) and section structure intact
            </p>
          )}
          <textarea
            value={editedCopy}
            onChange={(e) => setEditedCopy(e.target.value)}
            rows={isSequenceAgent ? 35 : 25}
            className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent font-mono text-sm"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <button
          onClick={handleApproveCopy}
          disabled={approving || !editedCopy.trim()}
          className="px-8 py-3 bg-fo-success text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-lg font-semibold"
        >
          {approving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Approving...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Approve Campaign
            </>
          )}
        </button>
      </div>
    </div>
  );
}
