'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { addImpersonateParam } from '@/lib/client-api-helpers';
import { Plus, Loader2, ChevronDown, ChevronUp, FileText, Mail, List, Heart, Image as ImageIcon, ExternalLink, Edit } from 'lucide-react';
import { renderHighlightedContent } from '@/lib/render-highlights';

interface Campaign {
  id: string;
  campaignName: string;
  meetingTranscript?: string | null;
  writtenStrategy?: string | null;
  additionalBrief?: string | null;
  intermediaryOutputs?: any;
  finalAssets?: any;
  output?: any; // For play_executions
  play_code?: string; // For play_executions
  play_category?: string; // For play_executions
  source?: string; // 'campaigns', 'outbound_campaigns', or 'play_executions'
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function OutboundCampaignsListContent() {
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());

  const loadCampaigns = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam('/api/client/outbound-campaigns', impersonateUserId);
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });

      const result = await response.json();
      if (result.success) {
        setCampaigns(result.campaigns || []);
      } else {
        toast.error('Failed to load campaigns');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaigns');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [impersonateUserId]);

  const toggleCampaign = (campaignId: string) => {
    setExpandedCampaigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      draft: 'bg-amber-100 text-amber-800',
      in_progress: 'bg-blue-100 text-blue-800',
      intermediary_generated: 'bg-blue-100 text-blue-800',
      assets_generated: 'bg-green-100 text-green-800',
      approved: 'bg-green-100 text-green-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };
  
  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      draft: 'Draft',
      in_progress: 'In Progress',
      intermediary_generated: 'Intermediary Generated',
      assets_generated: 'Assets Generated',
      approved: 'Approved',
      pending_approval: 'Pending Approval',
      rejected: 'Rejected'
    };
    return statusLabels[status] || status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const createCampaignUrl = impersonateUserId
    ? `/client/outbound-campaigns/new?impersonate=${impersonateUserId}`
    : '/client/outbound-campaigns/new';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-fo-primary mx-auto mb-4" />
          <p className="text-fo-text-secondary">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-fo-dark mb-2">Outbound Campaigns</h1>
          <p className="text-fo-text-secondary">View and manage all your outbound campaigns</p>
        </div>
        <Link
          href={createCampaignUrl}
          className="inline-flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create New Campaign
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-fo-border">
          <p className="text-fo-text-secondary text-lg mb-4">No campaigns yet</p>
          <Link
            href={createCampaignUrl}
            className="inline-flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Your First Campaign
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => {
            const isExpanded = expandedCampaigns.has(campaign.id);
            const intermediary = campaign.intermediaryOutputs || {};
            const finalAssets = campaign.finalAssets || {};
            const campaignCopy = finalAssets.campaignCopy || {};

            return (
              <div key={campaign.id} className="bg-white rounded-lg shadow-sm border border-fo-border overflow-hidden">
                {/* Campaign Header */}
                <div
                  className="p-6 cursor-pointer hover:bg-fo-light transition-colors"
                  onClick={() => toggleCampaign(campaign.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-semibold text-fo-dark">{campaign.campaignName}</h2>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(campaign.status)}`}>
                          {getStatusLabel(campaign.status)}
                        </span>
                        {campaign.source === 'play_executions' && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            PLAY
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-fo-text-secondary">
                        <span>Created: {formatDate(campaign.createdAt)}</span>
                        {campaign.updatedAt && <span>Updated: {formatDate(campaign.updatedAt)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {campaign.source === 'play_executions' ? (
                        // For play executions, link to the execution page
                        <Link
                          href={impersonateUserId
                            ? `/client/${campaign.play_category}/${campaign.play_code}/${campaign.id}?impersonate=${impersonateUserId}`
                            : `/client/${campaign.play_category}/${campaign.play_code}/${campaign.id}`
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-fo-primary hover:text-fo-primary-dark text-sm font-medium"
                        >
                          <Edit className="w-4 h-4" />
                          View/Edit
                        </Link>
                      ) : (
                        // For campaigns, link to the intermediary page
                        <Link
                          href={impersonateUserId
                            ? `/client/outbound-campaigns/${campaign.id}/intermediary?impersonate=${impersonateUserId}`
                            : `/client/outbound-campaigns/${campaign.id}/intermediary`
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-fo-primary hover:text-fo-primary-dark text-sm font-medium"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </Link>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-fo-text-secondary" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-fo-text-secondary" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-fo-border p-6 space-y-6">
                    {campaign.source === 'play_executions' ? (
                      // Display play execution output
                      <div>
                        <h3 className="text-lg font-semibold text-fo-dark mb-4">
                          Play Output
                        </h3>
                        <div className="bg-fo-light rounded-lg p-4">
                          <div className="text-sm text-fo-text whitespace-pre-wrap max-h-96 overflow-y-auto">
                            {campaign.output?.content || 'No output available'}
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Link
                            href={impersonateUserId
                              ? `/client/${campaign.play_category}/${campaign.play_code}/${campaign.id}?impersonate=${impersonateUserId}`
                              : `/client/${campaign.play_category}/${campaign.play_code}/${campaign.id}`
                            }
                            className="inline-flex items-center gap-1 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary-dark text-sm"
                          >
                            <Edit className="w-4 h-4" />
                            View Full Output & Edit
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Campaign Brief Section */}
                        <div>
                          <h3 className="text-lg font-semibold text-fo-dark mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Campaign Brief
                          </h3>
                          <div className="space-y-4">
                            {campaign.meetingTranscript && (
                          <div>
                            <h4 className="font-medium text-fo-dark mb-2">Meeting Transcript</h4>
                            <div className="bg-fo-light rounded-lg p-4 text-sm text-fo-text whitespace-pre-wrap">
                              {campaign.meetingTranscript}
                            </div>
                          </div>
                        )}
                        {campaign.writtenStrategy && (
                          <div>
                            <h4 className="font-medium text-fo-dark mb-2">Written Strategy (Emails, Slack, Teams messages)</h4>
                            <div className="bg-fo-light rounded-lg p-4 text-sm text-fo-text whitespace-pre-wrap">
                              {campaign.writtenStrategy}
                            </div>
                          </div>
                        )}
                        {campaign.additionalBrief && (
                          <div>
                            <h4 className="font-medium text-fo-dark mb-2">Additional Campaign Brief</h4>
                            <div className="bg-fo-light rounded-lg p-4 text-sm text-fo-text whitespace-pre-wrap">
                              {campaign.additionalBrief}
                            </div>
                          </div>
                        )}
                        {!campaign.meetingTranscript && !campaign.writtenStrategy && !campaign.additionalBrief && (
                          <p className="text-fo-text-secondary text-sm">No campaign brief provided</p>
                        )}
                      </div>
                    </div>

                    {/* Intermediary Outputs Section */}
                    {(intermediary.listBuildingStrategy || intermediary.hook || intermediary.attractionOffer || intermediary.asset) && (
                      <div>
                        <h3 className="text-lg font-semibold text-fo-dark mb-4 flex items-center gap-2">
                          <List className="w-5 h-5" />
                          Intermediary Outputs
                        </h3>
                        <div className="space-y-4">
                          {intermediary.listBuildingStrategy && (
                            <div>
                              <h4 className="font-medium text-fo-dark mb-2">List Building Strategy</h4>
                              <div className="bg-fo-light rounded-lg p-4 text-sm text-fo-text whitespace-pre-wrap">
                                {intermediary.listBuildingStrategy}
                              </div>
                            </div>
                          )}
                          {intermediary.hook && (
                            <div>
                              <h4 className="font-medium text-fo-dark mb-2">Hook (Shared Touchpoint)</h4>
                              <div className="bg-fo-light rounded-lg p-4 text-sm text-fo-text whitespace-pre-wrap">
                                {intermediary.hook}
                              </div>
                            </div>
                          )}
                          {intermediary.attractionOffer && (
                            <div>
                              <h4 className="font-medium text-fo-dark mb-2">Attraction Offer</h4>
                              <div className="bg-fo-light rounded-lg p-4 text-sm text-fo-text">
                                {intermediary.attractionOffer.headline && (
                                  <div className="mb-2">
                                    <span className="font-semibold">Headline: </span>
                                    {intermediary.attractionOffer.headline}
                                  </div>
                                )}
                                {intermediary.attractionOffer.valueBullets && intermediary.attractionOffer.valueBullets.length > 0 && (
                                  <div className="mb-2">
                                    <span className="font-semibold">Value Bullets:</span>
                                    <ul className="list-disc list-inside ml-4 mt-1">
                                      {intermediary.attractionOffer.valueBullets.map((bullet: string, idx: number) => (
                                        bullet && <li key={idx}>{bullet}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {intermediary.attractionOffer.easeBullets && intermediary.attractionOffer.easeBullets.length > 0 && (
                                  <div>
                                    <span className="font-semibold">Ease Bullets:</span>
                                    <ul className="list-disc list-inside ml-4 mt-1">
                                      {intermediary.attractionOffer.easeBullets.map((bullet: string, idx: number) => (
                                        bullet && <li key={idx}>{bullet}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {intermediary.asset && (
                            <div>
                              <h4 className="font-medium text-fo-dark mb-2">Asset</h4>
                              <div className="bg-fo-light rounded-lg p-4 text-sm text-fo-text">
                                <div className="mb-2">
                                  <span className="font-semibold">Type: </span>
                                  {intermediary.asset.type || 'N/A'}
                                </div>
                                {intermediary.asset.content && (
                                  <div className="mb-2">
                                    <span className="font-semibold">Content: </span>
                                    <div className="mt-1 whitespace-pre-wrap">{intermediary.asset.content}</div>
                                  </div>
                                )}
                                {intermediary.asset.url && (
                                  <div>
                                    <a
                                      href={intermediary.asset.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-fo-primary hover:text-fo-primary-dark inline-flex items-center gap-1"
                                    >
                                      {intermediary.asset.url}
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {intermediary.caseStudies && Array.isArray(intermediary.caseStudies) && intermediary.caseStudies.length > 0 && (
                            <div>
                              <h4 className="font-medium text-fo-dark mb-2">Case Studies</h4>
                              <div className="space-y-3">
                                {intermediary.caseStudies.map((caseStudy: any, idx: number) => (
                                  <div key={idx} className="bg-fo-light rounded-lg p-4 text-sm text-fo-text">
                                    {caseStudy.clientName && (
                                      <div className="font-semibold mb-1">{caseStudy.clientName}</div>
                                    )}
                                    {caseStudy.description && (
                                      <div className="whitespace-pre-wrap">{caseStudy.description}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Final Assets Section */}
                    {(Object.keys(campaignCopy).length > 0 || finalAssets.listBuildingInstructions || finalAssets.nurtureSequence || finalAssets.asset) && (
                      <div>
                        <h3 className="text-lg font-semibold text-fo-dark mb-4 flex items-center gap-2">
                          <Mail className="w-5 h-5" />
                          Final Assets
                        </h3>
                        <div className="space-y-4">
                          {/* Campaign Copy (Emails) */}
                          {Object.keys(campaignCopy).length > 0 && (
                            <div>
                              <h4 className="font-medium text-fo-dark mb-2">Campaign Copy (Emails)</h4>
                              <div className="space-y-3">
                                {Object.entries(campaignCopy).map(([emailKey, emailData]: [string, any]) => (
                                  <div key={emailKey} className="bg-fo-light rounded-lg p-4 text-sm">
                                    <div className="font-semibold text-fo-dark mb-2">Email {emailKey.replace('email', '')}</div>
                                    {emailData.subject && (
                                      <div className="mb-2">
                                        <span className="font-medium">Subject: </span>
                                        <span dangerouslySetInnerHTML={{ __html: renderHighlightedContent(emailData.highlightedSubject || emailData.subject) }} />
                                      </div>
                                    )}
                                    {emailData.body && (
                                      <div>
                                        <span className="font-medium">Body: </span>
                                        <div className="mt-1 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: renderHighlightedContent(emailData.highlightedBody || emailData.body) }} />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* List Building Instructions */}
                          {finalAssets.listBuildingInstructions && (
                            <div>
                              <h4 className="font-medium text-fo-dark mb-2">List Building Instructions</h4>
                              <div className="bg-fo-light rounded-lg p-4 text-sm text-fo-text whitespace-pre-wrap">
                                {finalAssets.listBuildingInstructions}
                              </div>
                            </div>
                          )}
                          {/* Nurture Sequence */}
                          {finalAssets.nurtureSequence && (
                            <div>
                              <h4 className="font-medium text-fo-dark mb-2 flex items-center gap-2">
                                <Heart className="w-4 h-4" />
                                Nurture Sequence
                              </h4>
                              <div className="bg-fo-light rounded-lg p-4 text-sm text-fo-text whitespace-pre-wrap">
                                {typeof finalAssets.nurtureSequence === 'string'
                                  ? finalAssets.nurtureSequence
                                  : finalAssets.nurtureSequence.content || JSON.stringify(finalAssets.nurtureSequence)}
                              </div>
                            </div>
                          )}
                          {/* Final Asset */}
                          {finalAssets.asset && (
                            <div>
                              <h4 className="font-medium text-fo-dark mb-2 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" />
                                Asset
                              </h4>
                              <div className="bg-fo-light rounded-lg p-4 text-sm text-fo-text">
                                <div className="mb-2">
                                  <span className="font-semibold">Type: </span>
                                  {finalAssets.asset.type || 'N/A'}
                                </div>
                                {finalAssets.asset.content && (
                                  <div className="mb-2">
                                    <span className="font-semibold">Content: </span>
                                    <div className="mt-1 whitespace-pre-wrap">{finalAssets.asset.content}</div>
                                  </div>
                                )}
                                {finalAssets.asset.url && (
                                  <div>
                                    <a
                                      href={finalAssets.asset.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-fo-primary hover:text-fo-primary-dark inline-flex items-center gap-1"
                                    >
                                      {finalAssets.asset.url}
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Empty State for Intermediary/Final Assets */}
                    {!intermediary.listBuildingStrategy && !intermediary.hook && !intermediary.attractionOffer && !intermediary.asset &&
                     Object.keys(campaignCopy).length === 0 && !finalAssets.listBuildingInstructions && !finalAssets.nurtureSequence && !finalAssets.asset && (
                      <div className="text-center py-8 text-fo-text-secondary">
                        <p>No intermediary outputs or final assets generated yet.</p>
                        <Link
                          href={impersonateUserId
                            ? `/client/outbound-campaigns/${campaign.id}/intermediary?impersonate=${impersonateUserId}`
                            : `/client/outbound-campaigns/${campaign.id}/intermediary`
                          }
                          className="text-fo-primary hover:text-fo-primary-dark font-medium mt-2 inline-block"
                        >
                          Generate outputs →
                        </Link>
                      </div>
                    )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
