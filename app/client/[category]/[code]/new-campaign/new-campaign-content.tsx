'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { addImpersonateParam } from '@/lib/client-api-helpers';
import { ChevronLeft, Loader2, ChevronRight, FileText, MessageSquare, Lightbulb, List, Mail, CheckCircle, Upload } from 'lucide-react';
import { renderHighlightedContent } from '@/lib/render-highlights';

type Step = 'brief' | 'intermediary' | 'list-questions' | 'copy';

export default function NewCampaignContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const impersonateUserId = searchParams.get('impersonate');
  
  const category = params.category as string;
  const code = params.code as string;

  // Step 1: Campaign Brief
  const [currentStep, setCurrentStep] = useState<Step>('brief');
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState('');
  const [meetingTranscript, setMeetingTranscript] = useState('');
  const [writtenStrategy, setWrittenStrategy] = useState('');
  const [documents, setDocuments] = useState('');
  const [blogPosts, setBlogPosts] = useState('');

  // Step 2: Additional Briefing
  const [additionalBrief, setAdditionalBrief] = useState('');
  const [tieToEvent, setTieToEvent] = useState(false);
  const [onlyProofPoints, setOnlyProofPoints] = useState(false);
  const [avoidClaims, setAvoidClaims] = useState(false);
  const [senderName, setSenderName] = useState('');

  // Step 3: Intermediary Outputs
  const [intermediaryOutputs, setIntermediaryOutputs] = useState<any>(null);
  
  // Step 4: List Questions
  const [hasAccountList, setHasAccountList] = useState<boolean | null>(null);
  const [hasProspectList, setHasProspectList] = useState<boolean | null>(null);
  
  // Step 5: Copy Review
  const [generatedCopy, setGeneratedCopy] = useState('');
  const [highlightedCopy, setHighlightedCopy] = useState('');
  const [editedCopy, setEditedCopy] = useState('');
  
  // Loading states
  const [loading, setLoading] = useState(false);

  // Step navigation helpers
  const stepOrder: Step[] = ['brief', 'intermediary', 'list-questions', 'copy'];
  const currentStepIndex = stepOrder.indexOf(currentStep);

  // Auto-set prospect list to false if account list is false
  useEffect(() => {
    if (hasAccountList === false && hasProspectList === null) {
      setHasProspectList(false);
    }
  }, [hasAccountList, hasProspectList]);

  // Step 1: Create campaign with brief
  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      toast.error('Campaign name is required');
      return;
    }

    if (!meetingTranscript && !writtenStrategy && !documents && !blogPosts) {
      toast.error('Please provide at least one type of campaign brief input');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam('/api/client/campaigns', impersonateUserId);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          playCode: code,
          campaignName,
          campaignType: campaignType || null,
          campaignBrief: {
            meeting_transcript: meetingTranscript || null,
            written_strategy: writtenStrategy || null
          },
          additionalBrief: additionalBrief?.trim() || null
        })
      });

      const result = await response.json();

      if (result.success) {
        setCampaignId(result.campaign.id);
        toast.success('Campaign created! Generating intermediary outputs...');
        setCurrentStep('intermediary');
        // Auto-generate intermediary outputs
        setTimeout(() => generateIntermediaryOutputs(result.campaign.id), 500);
      } else {
        toast.error(result.error || 'Failed to create campaign');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
      setLoading(false);
    }
  };

  // Step 2: Generate intermediary outputs
  const generateIntermediaryOutputs = async (id?: string) => {
    const targetCampaignId = id || campaignId;
    if (!targetCampaignId) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam(`/api/client/campaigns/${targetCampaignId}/intermediary`, impersonateUserId);
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
        setIntermediaryOutputs(result.intermediaryOutputs);
        toast.success('Intermediary outputs generated!');
        setCurrentStep('list-questions');
      } else {
        toast.error(result.error || 'Failed to generate intermediary outputs');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error generating intermediary outputs:', error);
      toast.error('Failed to generate intermediary outputs');
      setLoading(false);
    }
  };

  // Step 3: Answer list building questions
  const handleListQuestions = async () => {
    if (hasAccountList === null || hasProspectList === null) {
      toast.error('Please answer both list questions');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam(`/api/client/campaigns/${campaignId}/list-questions`, impersonateUserId);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          has_account_list: hasAccountList,
          has_prospect_list: hasProspectList
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        // Now generate copy
        generateCopy();
      } else {
        toast.error(result.error || 'Failed to save list questions');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error saving list questions:', error);
      toast.error('Failed to save list questions');
      setLoading(false);
    }
  };

  // Step 4: Generate campaign copy
  const generateCopy = async () => {
    if (!campaignId) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam(`/api/client/campaigns/${campaignId}/generate-copy`, impersonateUserId);
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
        setGeneratedCopy(result.finalOutputs.rawContent);
        setHighlightedCopy(result.finalOutputs.highlightedHtml);
        setEditedCopy(result.finalOutputs.rawContent);
        toast.success('Campaign copy generated!');
        setCurrentStep('copy');
      } else {
        toast.error(result.error || 'Failed to generate copy');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error generating copy:', error);
      toast.error('Failed to generate copy');
      setLoading(false);
    }
  };

  // Step 4 (final): Approve copy
  const handleApproveCopy = async () => {
    if (!editedCopy.trim()) {
      toast.error('Copy cannot be empty');
      return;
    }

    setLoading(true);
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
        toast.success('Campaign approved! Status updated to Launch Approved.');
        // Redirect to campaigns list
        const backUrl = impersonateUserId
          ? `/client/${category}?impersonate=${impersonateUserId}`
          : `/client/${category}`;
        router.push(backUrl);
      } else {
        toast.error(result.error || 'Failed to approve copy');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error approving copy:', error);
      toast.error('Failed to approve copy');
      setLoading(false);
    }
  };

  const backUrl = impersonateUserId
    ? `/client/${category}?impersonate=${impersonateUserId}`
    : `/client/${category}`;

  const campaignTypes = [
    'Pre-conference outreach',
    'Post-conference follow-up',
    'Webinar invite',
    'Cold outbound',
    'Nurture',
    'Reactivation',
    'Other'
  ];

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <Link href={backUrl} className="inline-flex items-center text-fo-primary hover:text-fo-primary-dark mb-6">
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Plays
      </Link>

      {/* Progress Indicator */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-6 mb-6">
        <div className="flex items-center justify-between">
          {stepOrder.map((step, index) => {
            const isActive = currentStep === step;
            const isCompleted = index < currentStepIndex;
            const stepLabels: Record<Step, string> = {
              brief: 'Campaign Brief',
              intermediary: 'Intermediary Outputs',
              'list-questions': 'List Questions',
              copy: 'Copy Review'
            };
            const stepIcons: Record<Step, any> = {
              brief: FileText,
              intermediary: Lightbulb,
              'list-questions': List,
              copy: Mail
            };
            const Icon = stepIcons[step];

            return (
              <div key={step} className="flex items-center">
                <div className={`flex items-center gap-2 ${
                  isActive ? 'text-fo-primary font-semibold' :
                  isCompleted ? 'text-fo-success' :
                  'text-fo-text-secondary'
                }`}>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    isActive ? 'bg-fo-primary text-white' :
                    isCompleted ? 'bg-fo-success text-white' :
                    'bg-fo-light text-fo-text-secondary'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="hidden md:block text-sm">{stepLabels[step]}</span>
                </div>
                {index < stepOrder.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-fo-text-secondary mx-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-8">
        {/* STEP 1: Campaign Brief */}
        {currentStep === 'brief' && (
          <div>
            <h1 className="text-3xl font-bold text-fo-dark mb-2">Create Campaign for Play {code}</h1>
            <p className="text-fo-text-secondary mb-8">
              Provide campaign details. Claire will generate production-ready copy.
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
                  placeholder="e.g., CES 2026 Pre-Event Outreach"
                  className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent"
                />
              </div>

              {/* Campaign Type - Only show for plays where it matters (conferences, etc.) */}
              {(code === '2009' || code === '2010') && (
                <div>
                  <label className="block text-sm font-semibold text-fo-dark mb-2">
                    Campaign Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={campaignType}
                    onChange={(e) => setCampaignType(e.target.value)}
                    className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent"
                  >
                    <option value="">Select campaign type...</option>
                    {campaignTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Meeting Transcript */}
              <div>
                <label className="block text-sm font-semibold text-fo-dark mb-2">
                  Meeting Transcript
                </label>
                <p className="text-xs text-fo-text-secondary mb-2">
                  Copy and paste the transcript from your strategic campaign meeting (Fathom, Gong, etc.)
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

              {/* Additional Context - combines documents, blog posts, constraints */}
              <div>
                <label className="block text-sm font-semibold text-fo-dark mb-2">
                  Additional Context <span className="text-fo-text-secondary font-normal">(Optional)</span>
                </label>
                <p className="text-xs text-fo-text-secondary mb-2">
                  Add any extra context: document links, blog post URLs, must-include lines, exclusions, style constraints, compliance requirements, sender preferences, etc.
                </p>
                <textarea
                  value={additionalBrief}
                  onChange={(e) => setAdditionalBrief(e.target.value)}
                  placeholder="Example:
- Blog post: https://company.com/blog/article
- Document: https://docs.google.com/...
- Must include: Our Q4 case study with Acme Corp
- Style: Professional but conversational
- Send from: Sarah Johnson, VP Sales
- Compliance: Avoid revenue claims"
                  rows={8}
                  className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent font-mono text-sm"
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
                onClick={handleCreateCampaign}
                disabled={loading || !campaignName.trim()}
                className="px-6 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Intermediary Outputs Review */}
        {currentStep === 'intermediary' && (
          <div>
            <h1 className="text-3xl font-bold text-fo-dark mb-2">Intermediary Outputs</h1>
            <p className="text-fo-text-secondary mb-8">
              {loading ? 'Generating intermediary outputs...' : 'Review the generated intermediary outputs'}
            </p>

            {loading ? (
              <div className="flex items-center justify-center min-h-[40vh]">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-fo-primary mx-auto mb-4" />
                  <p className="text-fo-text-secondary">Generating intermediary outputs...</p>
                </div>
              </div>
            ) : intermediaryOutputs ? (
              <div className="space-y-6">
                {/* List Building Instructions */}
                <div className="border border-fo-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-fo-dark mb-3 flex items-center gap-2">
                    <List className="w-5 h-5" />
                    List Building Instructions
                  </h3>
                  <p className="text-sm text-fo-text whitespace-pre-wrap bg-fo-light rounded p-4">
                    {intermediaryOutputs.listBuildingInstructions}
                  </p>
                </div>

                {/* Hook */}
                <div className="border border-fo-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-fo-dark mb-3">
                    Hook (Shared Touchpoint)
                  </h3>
                  <p className="text-sm text-fo-text bg-fo-light rounded p-4">
                    {intermediaryOutputs.hook}
                  </p>
                </div>

                {/* Attraction Offer */}
                <div className="border border-fo-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-fo-dark mb-3">
                    Attraction Offer
                  </h3>
                  <div className="bg-fo-light rounded p-4">
                    <p className="text-base font-semibold text-fo-dark mb-3">
                      {intermediaryOutputs.attractionOffer?.headline}
                    </p>
                    {intermediaryOutputs.attractionOffer?.valueBullets && intermediaryOutputs.attractionOffer.valueBullets.length > 0 && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-fo-dark">Value:</span>
                        <ul className="list-disc list-inside ml-4 mt-1 text-sm text-fo-text">
                          {intermediaryOutputs.attractionOffer.valueBullets.map((bullet: string, idx: number) => (
                            <li key={idx}>{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {intermediaryOutputs.attractionOffer?.easeBullets && intermediaryOutputs.attractionOffer.easeBullets.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-fo-dark">Ease:</span>
                        <ul className="list-disc list-inside ml-4 mt-1 text-sm text-fo-text">
                          {intermediaryOutputs.attractionOffer.easeBullets.map((bullet: string, idx: number) => (
                            <li key={idx}>{bullet}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Asset */}
                <div className="border border-fo-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-fo-dark mb-3">
                    Campaign Asset
                  </h3>
                  <div className="bg-fo-light rounded p-4 text-sm text-fo-text">
                    <p><span className="font-medium">Type:</span> {intermediaryOutputs.asset?.type || 'N/A'}</p>
                    {intermediaryOutputs.asset?.url && (
                      <p className="mt-2"><span className="font-medium">URL:</span> {intermediaryOutputs.asset.url}</p>
                    )}
                    {intermediaryOutputs.asset?.content && (
                      <p className="mt-2 whitespace-pre-wrap">{intermediaryOutputs.asset.content}</p>
                    )}
                  </div>
                </div>

                {/* Case Studies (Optional) */}
                {intermediaryOutputs.caseStudies && intermediaryOutputs.caseStudies.length > 0 && (
                  <div className="border border-fo-border rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-fo-dark mb-3">
                      Case Studies
                    </h3>
                    <div className="space-y-3">
                      {intermediaryOutputs.caseStudies.map((caseStudy: any, idx: number) => (
                        <div key={idx} className="bg-fo-light rounded p-4 text-sm">
                          <p className="font-semibold text-fo-dark mb-1">{caseStudy.clientName}</p>
                          <p className="text-fo-text">{caseStudy.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setCurrentStep('list-questions')}
                disabled={loading || !intermediaryOutputs}
                className="px-6 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                Continue to List Questions
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: List Building Questions */}
        {currentStep === 'list-questions' && (
          <div>
            <h1 className="text-3xl font-bold text-fo-dark mb-2">List Building</h1>
            <p className="text-fo-text-secondary mb-8">
              Do you already have the lists ready for this campaign?
            </p>

            <div className="space-y-6">
              {/* Account List Question */}
              <div className="border border-fo-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-fo-dark mb-4">
                  Do you have the account list ready?
                </h3>
                <p className="text-sm text-fo-text-secondary mb-4">
                  The account list includes companies/organizations you want to target.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setHasAccountList(true)}
                    className={`flex-1 px-6 py-3 border-2 rounded-lg transition-all ${
                      hasAccountList === true
                        ? 'border-fo-primary bg-fo-primary/10 text-fo-primary font-semibold'
                        : 'border-fo-border text-fo-dark hover:border-fo-primary/50'
                    }`}
                  >
                    Yes, I have it
                  </button>
                  <button
                    onClick={() => setHasAccountList(false)}
                    className={`flex-1 px-6 py-3 border-2 rounded-lg transition-all ${
                      hasAccountList === false
                        ? 'border-fo-primary bg-fo-primary/10 text-fo-primary font-semibold'
                        : 'border-fo-border text-fo-dark hover:border-fo-primary/50'
                    }`}
                  >
                    No, need help building it
                  </button>
                </div>
              </div>

              {/* Prospect List Question (shown if account list is available) */}
              {hasAccountList === true && (
                <div className="border border-fo-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-fo-dark mb-4">
                    Do you have the prospect list already built?
                  </h3>
                  <p className="text-sm text-fo-text-secondary mb-4">
                    The prospect list includes specific contacts at each account.
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setHasProspectList(true)}
                      className={`flex-1 px-6 py-3 border-2 rounded-lg transition-all ${
                        hasProspectList === true
                          ? 'border-fo-primary bg-fo-primary/10 text-fo-primary font-semibold'
                          : 'border-fo-border text-fo-dark hover:border-fo-primary/50'
                      }`}
                    >
                      Yes, I have it
                    </button>
                    <button
                      onClick={() => setHasProspectList(false)}
                      className={`flex-1 px-6 py-3 border-2 rounded-lg transition-all ${
                        hasProspectList === false
                          ? 'border-fo-primary bg-fo-primary/10 text-fo-primary font-semibold'
                          : 'border-fo-border text-fo-dark hover:border-fo-primary/50'
                      }`}
                    >
                      No, need help building it
                    </button>
                  </div>
                </div>
              )}

              {/* Info Message */}
              {hasAccountList !== null && hasProspectList !== null && (
                <div className={`p-4 rounded-lg ${
                  hasAccountList && hasProspectList
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <p className="text-sm">
                    {hasAccountList && hasProspectList ? (
                      <>
                        <span className="font-semibold">Great!</span> You can proceed to copy generation. You&apos;ll be able to upload your lists later.
                      </>
                    ) : (
                      <>
                        <span className="font-semibold">List building required.</span> The solution architect will be notified after copy generation to help build your lists.
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setCurrentStep('intermediary')}
                className="px-6 py-2 border border-fo-border rounded-lg text-fo-dark hover:bg-fo-light transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleListQuestions}
                disabled={loading || hasAccountList === null || hasProspectList === null}
                className="px-6 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Copy...
                  </>
                ) : (
                  <>
                    Continue & Generate Copy
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Copy Review & Approval */}
        {currentStep === 'copy' && (
          <div>
            <h1 className="text-3xl font-bold text-fo-dark mb-2">Campaign Copy</h1>
            <p className="text-fo-text-secondary mb-8">
              Review and edit the generated campaign copy. Highlights show personalization, proof points, and key elements.
            </p>

            <div className="space-y-6">
              {/* Copy Editor */}
              <div>
                <label className="block text-sm font-semibold text-fo-dark mb-2">
                  Campaign Copy
                </label>
                <p className="text-xs text-fo-text-secondary mb-2">
                  Edit the copy as needed. Make sure to keep placeholders like {`{{first_name}}`} and %signature% intact.
                </p>
                
                {/* Show highlighted version for reference */}
                <div className="mb-4 border border-fo-border rounded-lg p-4 bg-fo-light max-h-96 overflow-y-auto">
                  <h4 className="text-sm font-semibold text-fo-dark mb-2">Highlighted Preview:</h4>
                  <div 
                    className="text-sm text-fo-text whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: renderHighlightedContent(highlightedCopy) }}
                  />
                </div>

                {/* Editable version */}
                <textarea
                  value={editedCopy}
                  onChange={(e) => setEditedCopy(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-transparent font-mono text-sm"
                />
              </div>

              {/* Highlight Legend */}
              <div className="border border-fo-border rounded-lg p-4 bg-fo-light">
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
                    <span className="bg-highlight-personalization px-2 py-1 rounded font-semibold">Personalization</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setCurrentStep('list-questions')}
                className="px-6 py-2 border border-fo-border rounded-lg text-fo-dark hover:bg-fo-light transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleApproveCopy}
                disabled={loading || !editedCopy.trim()}
                className="px-6 py-2 bg-fo-success text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Approve Campaign
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
