'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { addImpersonateParam } from '@/lib/client-api-helpers';
import { Clock, CheckCircle2, XCircle, FileText, AlertTriangle, ArrowRight, Trash2 } from 'lucide-react';

interface Execution {
  id: string;
  status: string;
  created_at: string;
  executed_at: string;
  approved_at: string;
  claire_plays: {
    code: string;
    name: string;
    category: string;
  };
  play_approvals: Array<{
    id: string;
    shareable_token: string;
    status: string;
    due_date: string;
    approved_at: string;
    rejected_at: string;
    comments: string;
  }>;
}

export default function ApprovalsPageContent() {
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const statusFilter = searchParams.get('status') || 'all';
  const categoryFilter = searchParams.get('category') || 'all';

  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deletedIdsRef = useRef<Set<string>>(new Set()); // Track deleted IDs to filter them out
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    draft: 0
  });

  const loadApprovals = useCallback(async () => {
    try {
      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      // Add cache-busting timestamp
      params.append('_t', Date.now().toString());

      const url = addImpersonateParam(`/api/client/approvals?${params.toString()}`, impersonateUserId);
      console.log(`🔄 Loading approvals: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store', // Prevent browser caching
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });
      
      const data = await response.json();

      if (data.success) {
        // Filter out any deleted items even if server returns them (stale data protection)
        const filteredExecutions = (data.executions || []).filter(
          (e: Execution) => !deletedIdsRef.current.has(e.id)
        );
        console.log(`✅ Loaded ${data.executions?.length || 0} executions, ${filteredExecutions.length} after filtering deleted items`);
        setExecutions(filteredExecutions);
        
        // Calculate stats from filtered executions
        const pending = filteredExecutions.filter((e: Execution) => e.status === 'pending_approval').length;
        const approved = filteredExecutions.filter((e: Execution) => e.status === 'approved').length;
        const rejected = filteredExecutions.filter((e: Execution) => e.status === 'rejected').length;
        const draft = filteredExecutions.filter((e: Execution) => e.status === 'draft').length;

        setStats({ pending, approved, rejected, draft });
      } else {
        console.error('❌ Failed to load approvals:', data.error);
        toast.error('Failed to load approvals');
      }
      setLoading(false);
    } catch (error) {
      console.error('❌ Error loading approvals:', error);
      toast.error('Failed to load approvals');
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, impersonateUserId]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string; icon: any }> = {
      'pending_approval': { color: 'bg-fo-orange/20 text-fo-orange', label: 'Pending', icon: Clock },
      'approved': { color: 'bg-fo-tertiary-3/20 text-fo-tertiary-3', label: 'Approved', icon: CheckCircle2 },
      'rejected': { color: 'bg-fo-tertiary-4/20 text-fo-tertiary-4', label: 'Rejected', icon: XCircle },
      'draft': { color: 'bg-fo-light text-fo-text-secondary', label: 'Draft', icon: FileText },
    };
    
    return badges[status] || { color: 'bg-fo-light text-fo-text-secondary', label: status, icon: FileText };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isOverdue = (dueDate: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const handleDeleteDraft = async (executionId: string, playName: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete this draft?\n\nPlay: ${playName}\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) {
      return;
    }

    console.log(`🗑️ Deleting draft: ${executionId} (${playName})`);
    setDeletingId(executionId);
    
    // Store the item being deleted in case we need to restore it
    const itemToDelete = executions.find(e => e.id === executionId);
    
    // Add to deleted IDs ref to filter it out even after reload
    deletedIdsRef.current.add(executionId);
    
    // Optimistically remove from UI immediately and update stats
    setExecutions(prev => {
      const filtered = prev.filter(e => e.id !== executionId);
      // Update stats immediately
      const draftCount = filtered.filter((e: Execution) => e.status === 'draft').length;
      setStats(prevStats => ({
        ...prevStats,
        draft: draftCount
      }));
      return filtered;
    });
    
    try {
      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const deleteUrl = addImpersonateParam(`/api/client/executions/${executionId}`, impersonateUserId);
      console.log(`🗑️ DELETE request to: ${deleteUrl}`);
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });

      const result = await response.json();
      console.log(`🗑️ DELETE response (${response.status}):`, result);

      if (result.success) {
        toast.success('Draft deleted successfully');
        // Don't reload immediately - optimistic update is already applied
        // Only reload if we need to sync with server (optional background refresh)
        // The optimistic update should be sufficient for immediate UI feedback
      } else {
        // If deletion failed, remove from deleted IDs and restore the item in the UI
        deletedIdsRef.current.delete(executionId);
        console.error(`❌ Delete failed: ${result.error}`);
        toast.error(result.error || 'Failed to delete draft');
        if (itemToDelete) {
          setExecutions(prev => [...prev, itemToDelete].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ));
          // Restore stats
          setStats(prevStats => ({
            ...prevStats,
            draft: prevStats.draft + 1
          }));
        }
        // Still reload to get the correct state
        await loadApprovals();
      }
    } catch (error) {
      // If deletion failed, remove from deleted IDs and restore the item
      deletedIdsRef.current.delete(executionId);
      console.error('❌ Error deleting draft:', error);
      toast.error('Failed to delete draft');
      // Restore the item if we have it
      if (itemToDelete) {
        setExecutions(prev => [...prev, itemToDelete].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
        // Restore stats
        setStats(prevStats => ({
          ...prevStats,
          draft: prevStats.draft + 1
        }));
      }
      // Reload to get the correct state
      await loadApprovals();
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fo-primary mx-auto mb-4"></div>
          <p className="text-fo-text-secondary">Loading approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Link
          href={impersonateUserId 
            ? `/client/approvals?status=pending_approval&impersonate=${impersonateUserId}` 
            : '/client/approvals?status=pending_approval'
          }
          className={`bg-white rounded-lg shadow-sm p-6 border ${
            statusFilter === 'pending_approval' ? 'border-fo-orange' : 'border-fo-border'
          } hover:shadow-md transition-all cursor-pointer`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-fo-text-secondary mb-2">Pending</p>
              <p className="text-3xl font-bold text-fo-dark">{stats.pending}</p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              statusFilter === 'pending_approval' ? 'bg-fo-orange/10' : 'bg-fo-orange/5'
            }`}>
              <Clock className="w-6 h-6 text-fo-orange" strokeWidth={2} />
            </div>
          </div>
        </Link>

        <Link
          href={impersonateUserId 
            ? `/client/approvals?status=approved&impersonate=${impersonateUserId}` 
            : '/client/approvals?status=approved'
          }
          className={`bg-white rounded-lg shadow-sm p-6 border ${
            statusFilter === 'approved' ? 'border-fo-green' : 'border-fo-border'
          } hover:shadow-md transition-all cursor-pointer`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-fo-text-secondary mb-2">Approved</p>
              <p className="text-3xl font-bold text-fo-dark">{stats.approved}</p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              statusFilter === 'approved' ? 'bg-fo-tertiary-3/10' : 'bg-fo-tertiary-3/5'
            }`}>
              <CheckCircle2 className="w-6 h-6 text-fo-tertiary-3" strokeWidth={2} />
            </div>
          </div>
        </Link>

        <Link
          href={impersonateUserId 
            ? `/client/approvals?status=rejected&impersonate=${impersonateUserId}` 
            : '/client/approvals?status=rejected'
          }
          className={`bg-white rounded-lg shadow-sm p-6 border ${
            statusFilter === 'rejected' ? 'border-fo-tertiary-4' : 'border-fo-border'
          } hover:shadow-md transition-all cursor-pointer`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-fo-text-secondary mb-2">Rejected</p>
              <p className="text-3xl font-bold text-fo-dark">{stats.rejected}</p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              statusFilter === 'rejected' ? 'bg-fo-tertiary-4/10' : 'bg-fo-tertiary-4/5'
            }`}>
              <XCircle className="w-6 h-6 text-fo-tertiary-4" strokeWidth={2} />
            </div>
          </div>
        </Link>

        <Link
          href={impersonateUserId 
            ? `/client/approvals?status=draft&impersonate=${impersonateUserId}` 
            : '/client/approvals?status=draft'
          }
          className={`bg-white rounded-lg shadow-sm p-6 border ${
            statusFilter === 'draft' ? 'border-fo-primary' : 'border-fo-border'
          } hover:shadow-md transition-all cursor-pointer`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-fo-text-secondary mb-2">Draft</p>
              <p className="text-3xl font-bold text-fo-dark">{stats.draft}</p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              statusFilter === 'draft' ? 'bg-fo-primary/10' : 'bg-fo-primary/5'
            }`}>
              <FileText className="w-6 h-6 text-fo-primary" strokeWidth={2} />
            </div>
          </div>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-fo-border">
        <div className="flex flex-wrap gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams.toString());
              if (e.target.value === 'all') {
                params.delete('status');
              } else {
                params.set('status', e.target.value);
              }
              // Preserve impersonate parameter
              if (impersonateUserId) {
                params.set('impersonate', impersonateUserId);
              }
              window.location.href = `/client/approvals?${params.toString()}`;
            }}
            className="px-4 py-2 border border-fo-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-fo-primary"
          >
            <option value="all">All Statuses</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="draft">Draft</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams.toString());
              if (e.target.value === 'all') {
                params.delete('category');
              } else {
                params.set('category', e.target.value);
              }
              // Preserve impersonate parameter
              if (impersonateUserId) {
                params.set('impersonate', impersonateUserId);
              }
              window.location.href = `/client/approvals?${params.toString()}`;
            }}
            className="px-4 py-2 border border-fo-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-fo-primary"
          >
            <option value="all">All Categories</option>
            <option value="allbound">Allbound</option>
            <option value="outbound">Outbound</option>
            <option value="nurture">Nurture</option>
          </select>
        </div>
      </div>

      {/* Executions List */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-fo-border">
        <h2 className="text-lg font-semibold text-fo-dark mb-4">Approval Requests</h2>
        
        {executions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-fo-text-secondary text-lg font-normal mb-4">No approvals found</p>
            <Link href="/client/allbound" className="text-fo-primary hover:underline font-medium inline-flex items-center gap-1">
              Create your first play
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {executions.map((execution) => {
              const statusBadge = getStatusBadge(execution.status);
              const approval = execution.play_approvals?.[0];
              const StatusIcon = statusBadge.icon;
              
              // For drafts, link to execution detail page instead of approval page
              // For other statuses with approvals, link to approval page
              const href = execution.status === 'draft' 
                ? (impersonateUserId 
                    ? `/client/${execution.claire_plays?.category || 'allbound'}/${execution.claire_plays?.code || 'unknown'}/${execution.id}?impersonate=${impersonateUserId}`
                    : `/client/${execution.claire_plays?.category || 'allbound'}/${execution.claire_plays?.code || 'unknown'}/${execution.id}`
                  )
                : (impersonateUserId 
                    ? `/client/approve/${approval?.shareable_token || execution.id}?impersonate=${impersonateUserId}` 
                    : `/client/approve/${approval?.shareable_token || execution.id}`
                  );
              
              const isDraft = execution.status === 'draft';
              
              return (
                <div
                  key={execution.id}
                  className="block p-6 border border-fo-border rounded-lg hover:bg-fo-bg-light transition-colors bg-white"
                >
                  <div className="flex items-start justify-between">
                    <Link href={href} className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono font-bold text-fo-primary bg-fo-primary/10 px-2 py-1 rounded">
                          {execution.claire_plays?.code || 'Unknown'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${statusBadge.color} inline-flex items-center gap-1.5`}>
                          <StatusIcon className="w-3.5 h-3.5" strokeWidth={2} />
                          {statusBadge.label}
                        </span>
                        {approval?.due_date && isOverdue(approval.due_date) && (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-fo-tertiary-4/20 text-fo-tertiary-4 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" strokeWidth={2} />
                            Overdue
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-semibold text-fo-dark mb-2">
                        {execution.claire_plays?.name || 'Unknown Play'}
                      </h3>
                      
                      <div className="flex flex-wrap gap-4 text-sm font-normal text-fo-text-secondary">
                        <span>Created: {formatDate(execution.created_at)}</span>
                        {execution.executed_at && (
                          <span>Executed: {formatDate(execution.executed_at)}</span>
                        )}
                        {approval?.due_date && (
                          <span className={isOverdue(approval.due_date) ? 'text-fo-tertiary-4 font-semibold' : ''}>
                            Due: {formatDate(approval.due_date)}
                          </span>
                        )}
                        {execution.approved_at && (
                          <span>Approved: {formatDate(execution.approved_at)}</span>
                        )}
                      </div>
                      
                      {approval?.comments && (
                        <p className="text-sm font-normal text-fo-text-secondary mt-2 italic">
                          &ldquo;{approval.comments}&rdquo;
                        </p>
                      )}
                    </Link>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {isDraft && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteDraft(execution.id, execution.claire_plays?.name || 'Unknown Play');
                          }}
                          disabled={deletingId === execution.id}
                          className="p-2 text-fo-tertiary-4 hover:bg-fo-tertiary-4/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete draft"
                        >
                          {deletingId === execution.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-fo-tertiary-4"></div>
                          ) : (
                            <Trash2 className="w-5 h-5" strokeWidth={2} />
                          )}
                        </button>
                      )}
                      <ArrowRight className="w-5 h-5 text-gray-400" strokeWidth={2} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

