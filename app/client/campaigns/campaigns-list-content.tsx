'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { addImpersonateParam } from '@/lib/client-api-helpers';
import { Loader2, Filter, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Campaign {
  id: string;
  campaignName: string;
  playCode: string;
  playName: string;
  playCategory: string;
  campaignType: string;
  status: string;
  approvalStatus: string;
  listStatus: string;
  createdAt: string;
  updatedAt: string;
}

export default function CampaignsListContent() {
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterApprovalStatus, setFilterApprovalStatus] = useState<string>('all');

  const loadCampaigns = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      let url = '/api/client/campaigns';
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterApprovalStatus !== 'all') params.append('approval_status', filterApprovalStatus);
      if (params.toString()) url += `?${params.toString()}`;

      url = addImpersonateParam(url, impersonateUserId);

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
  }, [impersonateUserId, filterStatus, filterApprovalStatus]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any }> = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      intermediary_generated: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      assets_generated: { color: 'bg-purple-100 text-purple-800', icon: Clock },
      pending_approval: { color: 'bg-amber-100 text-amber-800', icon: AlertCircle },
      launch_approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle }
    };
    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getApprovalStatusBadge = (approvalStatus: string) => {
    const statusConfig: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending_list: 'bg-blue-100 text-blue-800',
      pending_copy: 'bg-amber-100 text-amber-800',
      launch_approved: 'bg-green-100 text-green-800'
    };
    return statusConfig[approvalStatus] || 'bg-gray-100 text-gray-800';
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

  const getCampaignActionUrl = (campaign: Campaign) => {
    // Determine next action based on status
    if (campaign.approvalStatus === 'pending_list' && campaign.listStatus === 'uploaded') {
      return impersonateUserId
        ? `/client/campaigns/${campaign.id}/approve-list?impersonate=${impersonateUserId}`
        : `/client/campaigns/${campaign.id}/approve-list`;
    }
    if (campaign.approvalStatus === 'pending_copy') {
      return impersonateUserId
        ? `/client/campaigns/${campaign.id}/approve-copy?impersonate=${impersonateUserId}`
        : `/client/campaigns/${campaign.id}/approve-copy`;
    }
    // Default: view campaign details
    return impersonateUserId
      ? `/client/${campaign.playCategory}/${campaign.playCode}/new-campaign?campaign_id=${campaign.id}&impersonate=${impersonateUserId}`
      : `/client/${campaign.playCategory}/${campaign.playCode}/new-campaign?campaign_id=${campaign.id}`;
  };

  const getActionLabel = (campaign: Campaign) => {
    if (campaign.approvalStatus === 'pending_list' && campaign.listStatus === 'uploaded') {
      return 'Approve List';
    }
    if (campaign.approvalStatus === 'pending_copy') {
      return 'Review Copy';
    }
    if (campaign.approvalStatus === 'launch_approved') {
      return 'View';
    }
    if (campaign.status === 'draft') {
      return 'Continue Setup';
    }
    return 'View Details';
  };

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fo-dark mb-2">All Campaigns</h1>
        <p className="text-fo-text-secondary">View and manage all your campaigns across all plays</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-fo-text-secondary" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-fo-dark mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="intermediary_generated">Intermediary Generated</option>
                <option value="assets_generated">Assets Generated</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="launch_approved">Launch Approved</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-fo-dark mb-1">Approval Status</label>
              <select
                value={filterApprovalStatus}
                onChange={(e) => setFilterApprovalStatus(e.target.value)}
                className="w-full px-3 py-2 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary text-sm"
              >
                <option value="all">All Approval Statuses</option>
                <option value="draft">Draft</option>
                <option value="pending_list">Pending List</option>
                <option value="pending_copy">Pending Copy</option>
                <option value="launch_approved">Launch Approved</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-fo-border">
          <p className="text-fo-text-secondary text-lg">No campaigns found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-lg shadow-sm border border-fo-border hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-fo-dark mb-1">{campaign.campaignName}</h2>
                    <p className="text-sm text-fo-text-secondary">
                      Play: {campaign.playCode} - {campaign.playName} | {campaign.campaignType || 'Type not specified'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(campaign.status)}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-fo-text-secondary mb-4">
                  <div>
                    <span className="font-medium">Approval:</span>{' '}
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getApprovalStatusBadge(campaign.approvalStatus)}`}>
                      {campaign.approvalStatus.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  {campaign.listStatus !== 'pending_questions' && (
                    <div>
                      <span className="font-medium">List:</span> {campaign.listStatus.replace('_', ' ')}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Created:</span> {formatDate(campaign.createdAt)}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link
                    href={getCampaignActionUrl(campaign)}
                    className="px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary-dark transition-colors text-sm font-semibold"
                  >
                    {getActionLabel(campaign)}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
