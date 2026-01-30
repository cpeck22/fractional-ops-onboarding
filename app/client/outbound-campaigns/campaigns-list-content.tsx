'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { addImpersonateParam } from '@/lib/client-api-helpers';
import { Plus, Loader2, ChevronDown, ChevronUp, FileText, Mail, List, Heart, Image as ImageIcon, ExternalLink, Edit, Trash2 } from 'lucide-react';
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
  runtime_context?: any; // For play_executions (personas, useCases, clientReferences)
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
  const statusFilter = searchParams.get('status') || 'all';
  const categoryFilter = searchParams.get('category') || 'all';
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    in_progress: 0,
    pending_approval: 0,
    approved: 0,
    rejected: 0
  });

  const loadCampaigns = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      // Add cache-busting timestamp
      const params = new URLSearchParams();
      params.append('_t', Date.now().toString());
      
      const url = addImpersonateParam(`/api/client/outbound-campaigns?${params.toString()}`, impersonateUserId);
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });

      const result = await response.json();
      if (result.success) {
        const allCampaigns = result.campaigns || [];
        setCampaigns(allCampaigns);
        
        // Calculate stats
        setStats({
          total: allCampaigns.length,
          draft: allCampaigns.filter((c: Campaign) => c.status === 'draft').length,
          in_progress: allCampaigns.filter((c: Campaign) => c.status === 'in_progress').length,
          pending_approval: allCampaigns.filter((c: Campaign) => c.status === 'pending_approval').length,
          approved: allCampaigns.filter((c: Campaign) => c.status === 'approved').length,
          rejected: allCampaigns.filter((c: Campaign) => c.status === 'rejected').length
        });
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
  }, [impersonateUserId, statusFilter, categoryFilter]);

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

  const handleDeleteClick = (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent campaign expansion
    setCampaignToDelete(campaign);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!campaignToDelete) return;

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const deleteUrl = addImpersonateParam(`/api/client/campaigns/${campaignToDelete.id}`, impersonateUserId);
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Campaign deleted successfully');
        setDeleteModalOpen(false);
        setCampaignToDelete(null);
        // Reload campaigns
        await loadCampaigns();
      } else {
        toast.error(result.error || 'Failed to delete campaign');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setCampaignToDelete(null);
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

  // Filter campaigns based on URL params
  const filteredCampaigns = campaigns.filter(campaign => {
    // Status filter
    if (statusFilter !== 'all' && campaign.status !== statusFilter) {
      return false;
    }
    
    // Category filter (only for play executions)
    if (categoryFilter !== 'all' && campaign.source === 'play_executions') {
      if (campaign.play_category !== categoryFilter) {
        return false;
      }
    }
    
    return true;
  });

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
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-fo-dark mb-2">Campaign Status Hub</h1>
          <p className="text-fo-text-secondary">Collaborate on campaigns, plays, and assets</p>
        </div>
        <Link
          href={createCampaignUrl}
          className="inline-flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create New Campaign
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Link
          href={impersonateUserId ? `/client/outbound-campaigns?status=all&impersonate=${impersonateUserId}` : '/client/outbound-campaigns?status=all'}
          className={`bg-white rounded-lg shadow-sm p-4 border ${statusFilter === 'all' ? 'border-fo-primary ring-2 ring-fo-primary/20' : 'border-fo-border'} hover:shadow-md transition-all cursor-pointer`}
        >
          <p className="text-xs font-medium text-fo-text-secondary mb-1">Total</p>
          <p className="text-2xl font-bold text-fo-dark">{stats.total}</p>
        </Link>

        <Link
          href={impersonateUserId ? `/client/outbound-campaigns?status=draft&impersonate=${impersonateUserId}` : '/client/outbound-campaigns?status=draft'}
          className={`bg-white rounded-lg shadow-sm p-4 border ${statusFilter === 'draft' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-fo-border'} hover:shadow-md transition-all cursor-pointer`}
        >
          <p className="text-xs font-medium text-fo-text-secondary mb-1">Draft</p>
          <p className="text-2xl font-bold text-amber-600">{stats.draft}</p>
        </Link>

        <Link
          href={impersonateUserId ? `/client/outbound-campaigns?status=in_progress&impersonate=${impersonateUserId}` : '/client/outbound-campaigns?status=in_progress'}
          className={`bg-white rounded-lg shadow-sm p-4 border ${statusFilter === 'in_progress' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-fo-border'} hover:shadow-md transition-all cursor-pointer`}
        >
          <p className="text-xs font-medium text-fo-text-secondary mb-1">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{stats.in_progress}</p>
        </Link>

        <Link
          href={impersonateUserId ? `/client/outbound-campaigns?status=pending_approval&impersonate=${impersonateUserId}` : '/client/outbound-campaigns?status=pending_approval'}
          className={`bg-white rounded-lg shadow-sm p-4 border ${statusFilter === 'pending_approval' ? 'border-fo-orange ring-2 ring-fo-orange/20' : 'border-fo-border'} hover:shadow-md transition-all cursor-pointer`}
        >
          <p className="text-xs font-medium text-fo-text-secondary mb-1">Pending</p>
          <p className="text-2xl font-bold text-fo-orange">{stats.pending_approval}</p>
        </Link>

        <Link
          href={impersonateUserId ? `/client/outbound-campaigns?status=approved&impersonate=${impersonateUserId}` : '/client/outbound-campaigns?status=approved'}
          className={`bg-white rounded-lg shadow-sm p-4 border ${statusFilter === 'approved' ? 'border-green-500 ring-2 ring-green-500/20' : 'border-fo-border'} hover:shadow-md transition-all cursor-pointer`}
        >
          <p className="text-xs font-medium text-fo-text-secondary mb-1">Approved</p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </Link>

        <Link
          href={impersonateUserId ? `/client/outbound-campaigns?status=rejected&impersonate=${impersonateUserId}` : '/client/outbound-campaigns?status=rejected'}
          className={`bg-white rounded-lg shadow-sm p-4 border ${statusFilter === 'rejected' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-fo-border'} hover:shadow-md transition-all cursor-pointer`}
        >
          <p className="text-xs font-medium text-fo-text-secondary mb-1">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-fo-border">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="text-xs font-medium text-fo-text-secondary mb-1 block">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams.toString());
                if (e.target.value === 'all') {
                  params.delete('category');
                } else {
                  params.set('category', e.target.value);
                }
                if (impersonateUserId) {
                  params.set('impersonate', impersonateUserId);
                }
                window.location.href = `/client/outbound-campaigns?${params.toString()}`;
              }}
              className="px-4 py-2 border border-fo-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-fo-primary"
            >
              <option value="all">All Categories</option>
              <option value="allbound">Allbound</option>
              <option value="outbound">Outbound</option>
              <option value="nurture">Nurture</option>
            </select>
          </div>
          <div className="ml-auto text-sm text-fo-text-secondary">
            Showing {filteredCampaigns.length} of {campaigns.length} campaigns
          </div>
        </div>
      </div>

      {filteredCampaigns.length === 0 ? (
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
          {filteredCampaigns.map((campaign) => {
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
                      <button
                        onClick={(e) => handleDeleteClick(campaign, e)}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium"
                        title="Delete campaign"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
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
                      // Display play execution details
                      <div className="space-y-6">
                        {/* Runtime Context Section */}
                        <div>
                          <h3 className="text-lg font-semibold text-fo-dark mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Play Configuration
                          </h3>
                          <div className="space-y-3">
                            {/* Persona */}
                            {campaign.runtime_context?.personas && campaign.runtime_context.personas.length > 0 && (
                              <div>
                                <h4 className="font-medium text-fo-dark mb-2 text-sm">Persona</h4>
                                <div className="bg-fo-light rounded-lg p-3 text-sm text-fo-text">
                                  {campaign.runtime_context.personas.map((p: any, idx: number) => (
                                    <div key={idx}>{p.name || 'Unnamed Persona'}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Use Cases */}
                            {campaign.runtime_context?.useCases && campaign.runtime_context.useCases.length > 0 && (
                              <div>
                                <h4 className="font-medium text-fo-dark mb-2 text-sm">Use Case(s)</h4>
                                <div className="bg-fo-light rounded-lg p-3 text-sm text-fo-text">
                                  {campaign.runtime_context.useCases.map((uc: any, idx: number) => (
                                    <div key={idx}>• {uc.name || 'Unnamed Use Case'}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Client References */}
                            {campaign.runtime_context?.clientReferences && campaign.runtime_context.clientReferences.length > 0 && (
                              <div>
                                <h4 className="font-medium text-fo-dark mb-2 text-sm">Client Reference(s)</h4>
                                <div className="bg-fo-light rounded-lg p-3 text-sm text-fo-text">
                                  {campaign.runtime_context.clientReferences.map((ref: any, idx: number) => (
                                    <div key={idx}>• {ref.name || 'Unnamed Reference'}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Play Output Section */}
                        <div>
                          <h3 className="text-lg font-semibold text-fo-dark mb-4 flex items-center gap-2">
                            <Mail className="w-5 h-5" />
                            Generated Output
                          </h3>
                          <div className="bg-fo-light rounded-lg p-4">
                            <div className="text-sm text-fo-text whitespace-pre-wrap max-h-96 overflow-y-auto">
                              {campaign.output?.content || campaign.output?.highlighted_html || 'No output available'}
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

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && campaignToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-fo-dark mb-2">Delete Campaign?</h3>
                <p className="text-sm text-fo-text-secondary mb-2">
                  Are you sure you want to delete this campaign?
                </p>
                <p className="text-sm font-medium text-fo-dark">
                  &ldquo;{campaignToDelete.campaignName}&rdquo;
                </p>
              </div>
            </div>
            <p className="text-sm text-red-600 mb-6">
              This action cannot be undone. All campaign data will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                disabled={deleting}
                className="px-4 py-2 border border-fo-border text-fo-dark rounded-lg hover:bg-fo-light transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Yes, Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
