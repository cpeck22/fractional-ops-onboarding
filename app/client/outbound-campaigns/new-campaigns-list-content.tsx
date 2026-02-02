'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { addImpersonateParam } from '@/lib/client-api-helpers';
import { Plus, Loader2, Edit, Trash2, ChevronDown, Lock, LockOpen } from 'lucide-react';
import SelectListModal from '@/components/SelectListModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

interface Campaign {
  id: string;
  campaignName: string;
  play_code?: string;
  play_name?: string;
  play_category?: string;
  source?: string; // 'play_executions', 'campaigns', or 'outbound_campaigns'
  copy_status: 'in_progress' | 'changes_required' | 'approved';
  list_status: 'not_started' | 'in_progress' | 'approved';
  launch_status: 'not_started' | 'in_progress' | 'live';
  list_id?: string | null;
  list_name?: string | null;
  created_by?: string;
  created_at: string;
  updated_by?: string;
  updated_at: string;
}

export default function NewCampaignsListContent() {
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectListModalOpen, setSelectListModalOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam('/api/client/outbound-campaigns', impersonateUserId);
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
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
  }, [impersonateUserId]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleSelectExistingList = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setSelectListModalOpen(true);
  };

  const handleListSelected = async (listId: string, listName: string) => {
    if (!selectedCampaignId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam(`/api/client/outbound-campaigns/${selectedCampaignId}/attach-list`, impersonateUserId);
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        body: JSON.stringify({ list_id: listId, list_name: listName })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('List attached successfully!');
        loadCampaigns();
      } else {
        toast.error(result.error || 'Failed to attach list');
      }
    } catch (error) {
      console.error('Error attaching list:', error);
      toast.error('Failed to attach list');
    }
  };

  const handleCreateNewList = () => {
    toast('Create New List feature coming soon!');
    // TODO: Implement create new list flow
  };

  const handleUpdateLaunchStatus = async (campaignId: string, newStatus: 'in_progress' | 'live') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam(`/api/client/outbound-campaigns/${campaignId}/update-launch-status`, impersonateUserId);
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        body: JSON.stringify({ launch_status: newStatus })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(newStatus === 'live' ? 'Campaign launched! 🚀' : 'Launch status updated');
        loadCampaigns();
        
        // Trigger Zapier webhook if launching live
        if (newStatus === 'live') {
          // TODO: Call Zapier webhook
          console.log('🔔 Zapier webhook would trigger here for campaign:', campaignId);
        }
      } else {
        toast.error(result.error || 'Failed to update launch status');
      }
    } catch (error) {
      console.error('Error updating launch status:', error);
      toast.error('Failed to update launch status');
    }
  };

  const handleDeleteClick = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setDeleteModalOpen(true);
    setExpandedMenu(null);
  };

  const handleDeleteConfirm = async () => {
    if (!campaignToDelete) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam(`/api/client/outbound-campaigns/${campaignToDelete.id}`, impersonateUserId);
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Campaign deleted');
        loadCampaigns();
      } else {
        toast.error(result.error || 'Failed to delete campaign');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
    }
  };

  const getStatusColor = (status: string, type: 'copy' | 'list' | 'launch') => {
    if (type === 'copy') {
      switch (status) {
        case 'in_progress': return 'bg-orange-500';
        case 'changes_required': return 'bg-red-500';
        case 'approved': return 'bg-green-500';
        default: return 'bg-gray-400';
      }
    }
    if (type === 'list' || type === 'launch') {
      switch (status) {
        case 'not_started': return 'bg-gray-400';
        case 'in_progress': return 'bg-fo-orange';
        case 'approved': return 'bg-green-500';
        case 'live': return 'bg-green-500';
        default: return 'bg-gray-400';
      }
    }
    return 'bg-gray-400';
  };

  const getStatusLabel = (status: string, type: 'copy' | 'list' | 'launch') => {
    if (type === 'copy') {
      switch (status) {
        case 'in_progress': return 'In Progress';
        case 'changes_required': return 'Changes Required';
        case 'approved': return 'Approved';
        default: return 'Not Started';
      }
    }
    if (type === 'list') {
      switch (status) {
        case 'not_started': return 'Not Started';
        case 'in_progress': return 'In Progress';
        case 'approved': return 'Approved';
        default: return 'Not Started';
      }
    }
    if (type === 'launch') {
      switch (status) {
        case 'not_started': return 'Not Started';
        case 'in_progress': return 'In Progress';
        case 'live': return 'Live';
        default: return 'Not Started';
      }
    }
    return 'Not Started';
  };

  const isLaunchLocked = (campaign: Campaign) => {
    return campaign.copy_status !== 'approved' || campaign.list_status !== 'approved';
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
      {/* Header with Create Button */}
      <div className="mb-6 flex justify-end">
        <Link
          href={createCampaignUrl}
          className="inline-flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </Link>
      </div>

      {/* Campaigns List */}
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
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-lg shadow-sm border border-fo-border hover:shadow-md transition-shadow">
              <div className="p-3 py-2">
                <div className="grid grid-cols-12 gap-3 items-center">
                  {/* Left Side: Campaign Details */}
                  <div className="col-span-3 space-y-0.5">
                    <div className="text-xs">
                      <span className="font-mono font-medium text-fo-primary">[ID#{campaign.id.substring(0, 6)}]</span>
                      <span className="text-fo-dark font-medium ml-1">- {campaign.campaignName}</span>
                    </div>
                    {campaign.play_code && (
                      <div className="text-xs text-fo-text-secondary">
                        <span className="font-mono font-medium">[Play {campaign.play_code}]</span>
                        <span className="ml-1">- {campaign.play_name || 'Unknown Play'}</span>
                      </div>
                    )}
                  </div>

                  {/* Middle: Three Column Status (tighter) */}
                  <div className="col-span-6 grid grid-cols-3 gap-2">
                    {/* Copy Column */}
                    <div className="flex flex-col items-center">
                      <div className="text-[11px] font-normal text-fo-dark mb-1">Copy</div>
                      <Link
                        href={
                          campaign.source === 'play_executions' && campaign.play_category && campaign.play_code
                            ? impersonateUserId
                              ? `/client/${campaign.play_category}/${campaign.play_code}/${campaign.id}?impersonate=${impersonateUserId}`
                              : `/client/${campaign.play_category}/${campaign.play_code}/${campaign.id}`
                            : impersonateUserId
                              ? `/client/outbound-campaigns/${campaign.id}/intermediary?impersonate=${impersonateUserId}`
                              : `/client/outbound-campaigns/${campaign.id}/intermediary`
                        }
                        className={`w-full h-8 ${getStatusColor(campaign.copy_status, 'copy')} rounded flex items-center justify-center text-white font-medium text-[11px] hover:opacity-90 transition-opacity cursor-pointer`}
                      >
                        {getStatusLabel(campaign.copy_status, 'copy')}
                      </Link>
                    </div>

                    {/* List Column */}
                    <div className="flex flex-col items-center">
                      <div className="text-[11px] font-normal text-fo-dark mb-1">List</div>
                      {campaign.list_status === 'not_started' ? (
                        <div className="flex gap-1.5 w-full">
                          <button
                            onClick={() => handleSelectExistingList(campaign.id)}
                            className="flex-1 h-8 px-2 bg-green-600 text-white rounded text-[11px] font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
                          >
                            Select
                          </button>
                          <button
                            onClick={handleCreateNewList}
                            className="flex-1 h-8 px-2 bg-gray-400 text-white rounded text-[11px] font-medium hover:bg-gray-500 transition-colors flex items-center justify-center"
                          >
                            Create
                          </button>
                        </div>
                      ) : (
                        <div className={`w-full h-8 ${getStatusColor(campaign.list_status, 'list')} rounded flex flex-col items-center justify-center text-white font-medium text-[11px] px-1`}>
                          <div>{getStatusLabel(campaign.list_status, 'list')}</div>
                          {campaign.list_name && (
                            <div className="text-[9px] mt-0.5 opacity-90 text-center truncate w-full font-normal">
                              {campaign.list_name}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Launch Column */}
                    <div className="flex flex-col items-center">
                      <div className="text-[11px] font-normal text-fo-dark mb-1">Launch</div>
                      {isLaunchLocked(campaign) ? (
                        <div className="w-full h-8 bg-gray-400 rounded flex items-center justify-center text-white font-medium text-[11px] gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Locked</span>
                        </div>
                      ) : campaign.launch_status === 'not_started' || campaign.launch_status === 'in_progress' ? (
                        <button
                          onClick={() => handleUpdateLaunchStatus(campaign.id, campaign.launch_status === 'not_started' ? 'in_progress' : 'live')}
                          className={`w-full h-8 ${getStatusColor(campaign.launch_status, 'launch')} rounded flex items-center justify-center text-white font-medium text-[11px] hover:opacity-90 transition-opacity gap-1`}
                        >
                          <LockOpen className="w-3 h-3" />
                          <span>{campaign.launch_status === 'not_started' ? 'Start' : 'Launch'}</span>
                        </button>
                      ) : (
                        <div className={`w-full h-8 ${getStatusColor(campaign.launch_status, 'launch')} rounded flex items-center justify-center text-white font-medium text-[11px]`}>
                          {getStatusLabel(campaign.launch_status, 'launch')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Timestamps */}
                  <div className="col-span-2 text-[10px] text-fo-text-secondary font-normal space-y-0.5">
                    <div>Created: {new Date(campaign.created_at).toLocaleDateString()}</div>
                    <div>Updated: {new Date(campaign.updated_at).toLocaleDateString()}</div>
                  </div>

                  {/* Actions Menu */}
                  <div className="col-span-1 flex items-center justify-end">
                    <div className="relative">
                      <button
                        onClick={() => setExpandedMenu(expandedMenu === campaign.id ? null : campaign.id)}
                        className="p-1 hover:bg-fo-light rounded transition-colors"
                      >
                        <ChevronDown className="w-4 h-4 text-fo-text-secondary" />
                      </button>
                      
                      {expandedMenu === campaign.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-fo-border rounded-lg shadow-xl z-50 min-w-[130px]">
                          <Link
                            href={
                              campaign.source === 'play_executions' && campaign.play_category && campaign.play_code
                                ? impersonateUserId
                                  ? `/client/${campaign.play_category}/${campaign.play_code}/${campaign.id}?impersonate=${impersonateUserId}`
                                  : `/client/${campaign.play_category}/${campaign.play_code}/${campaign.id}`
                                : impersonateUserId
                                  ? `/client/outbound-campaigns/${campaign.id}/intermediary?impersonate=${impersonateUserId}`
                                  : `/client/outbound-campaigns/${campaign.id}/intermediary`
                            }
                            className="flex items-center gap-2 px-3 py-2 text-fo-primary hover:bg-fo-light text-xs transition-colors"
                            onClick={() => setExpandedMenu(null)}
                          >
                            <Edit className="w-3 h-3" />
                            View/Edit
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(campaign)}
                            className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 text-xs transition-colors w-full text-left border-t border-fo-border"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Select List Modal */}
      <SelectListModal
        isOpen={selectListModalOpen}
        onClose={() => {
          setSelectListModalOpen(false);
          setSelectedCampaignId(null);
        }}
        onSelect={handleListSelected}
        impersonateUserId={impersonateUserId}
      />

      {/* Delete Confirmation Modal */}
      {campaignToDelete && (
        <ConfirmDeleteModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setCampaignToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          itemName={campaignToDelete.campaignName}
          itemType="campaign"
        />
      )}
    </div>
  );
}
