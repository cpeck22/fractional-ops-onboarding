'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { addImpersonateParam } from '@/lib/client-api-helpers';
import { ChevronLeft, Loader2 } from 'lucide-react';

export default function NewOutboundCampaignPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');

  const [campaignName, setCampaignName] = useState('');
  const [meetingTranscript, setMeetingTranscript] = useState('');
  const [writtenStrategy, setWrittenStrategy] = useState('');
  const [additionalBrief, setAdditionalBrief] = useState('');
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!campaignName.trim()) {
      toast.error('Campaign name is required');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam('/api/client/outbound-campaigns', impersonateUserId);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          campaignName,
          meetingTranscript,
          writtenStrategy,
          additionalBrief
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Campaign created! Generating intermediary outputs...');
        const nextUrl = impersonateUserId
          ? `/client/outbound-campaigns/${result.campaign.id}/intermediary?impersonate=${impersonateUserId}`
          : `/client/outbound-campaigns/${result.campaign.id}/intermediary`;
        router.push(nextUrl);
      } else {
        toast.error(result.error || 'Failed to create campaign');
        setSaving(false);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
      setSaving(false);
    }
  };

  const backUrl = impersonateUserId
    ? `/client/outbound?impersonate=${impersonateUserId}`
    : '/client/outbound';

  return (
    <div className="max-w-4xl mx-auto">
      <Link href={backUrl} className="inline-flex items-center text-fo-primary hover:text-fo-primary-dark mb-6">
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Campaigns
      </Link>

      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-8">
        <h1 className="text-3xl font-bold text-fo-dark mb-2">Create Outbound Campaign</h1>
        <p className="text-fo-text-secondary mb-8">
          Provide the campaign details below. Claire will generate all the assets you need.
        </p>

        <div className="space-y-6">
          {/* Campaign Name */}
          <div>
            <label className="block text-sm font-semibold text-fo-dark mb-2">
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., CES Innovation Assessment Campaign"
              className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent"
            />
          </div>

          {/* Meeting Transcript */}
          <div>
            <label className="block text-sm font-semibold text-fo-dark mb-2">
              Meeting Transcript
            </label>
            <p className="text-xs text-fo-text-secondary mb-2">
              Copy and paste the transcript from your strategic campaign meeting
            </p>
            <textarea
              value={meetingTranscript}
              onChange={(e) => setMeetingTranscript(e.target.value)}
              placeholder="Paste meeting transcript here..."
              rows={8}
              className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent font-mono text-sm"
            />
          </div>

          {/* Written Strategy */}
          <div>
            <label className="block text-sm font-semibold text-fo-dark mb-2">
              Written Strategy
            </label>
            <p className="text-xs text-fo-text-secondary mb-2">
              Email threads, Slack messages, Teams messages, group chat messages related to the campaign
            </p>
            <textarea
              value={writtenStrategy}
              onChange={(e) => setWrittenStrategy(e.target.value)}
              placeholder="Paste emails, messages, or written strategy here..."
              rows={8}
              className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent font-mono text-sm"
            />
          </div>

          {/* Additional Brief */}
          <div>
            <label className="block text-sm font-semibold text-fo-dark mb-2">
              Additional Campaign Brief <span className="text-fo-text-secondary font-normal">(Optional)</span>
            </label>
            <p className="text-xs text-fo-text-secondary mb-2">
              Extra context to fine-tune the campaign instructions (e.g., what certain touchpoints mean, targeting details, industry specifics)
            </p>
            <textarea
              value={additionalBrief}
              onChange={(e) => setAdditionalBrief(e.target.value)}
              placeholder="Add any additional context or instructions here..."
              rows={6}
              className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <Link
            href={backUrl}
            className="px-6 py-2 border border-fo-border rounded-lg text-fo-dark hover:bg-fo-light transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleContinue}
            disabled={saving || !campaignName.trim()}
            className="px-6 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Continue to Intermediary Outputs'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
