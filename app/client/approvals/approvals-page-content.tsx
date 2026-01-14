'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { addImpersonateParam } from '@/lib/client-api-helpers';

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

      const url = addImpersonateParam(`/api/client/approvals?${params.toString()}`, impersonateUserId);
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });
      const data = await response.json();

      if (data.success) {
        setExecutions(data.executions || []);
        
        // Calculate stats
        const pending = data.executions.filter((e: Execution) => e.status === 'pending_approval').length;
        const approved = data.executions.filter((e: Execution) => e.status === 'approved').length;
        const rejected = data.executions.filter((e: Execution) => e.status === 'rejected').length;
        const draft = data.executions.filter((e: Execution) => e.status === 'draft').length;

        setStats({ pending, approved, rejected, draft });
      } else {
        toast.error('Failed to load approvals');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading approvals:', error);
      toast.error('Failed to load approvals');
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, impersonateUserId]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      'pending_approval': { color: 'bg-fo-orange/20 text-fo-orange', label: '⏳ Pending' },
      'approved': { color: 'bg-fo-green/20 text-fo-green', label: '✅ Approved' },
      'rejected': { color: 'bg-red-100 text-red-800', label: '❌ Rejected' },
      'draft': { color: 'bg-fo-light text-fo-text-secondary', label: '📝 Draft' },
    };
    
    return badges[status] || { color: 'bg-fo-light text-fo-text-secondary', label: status };
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-fo-dark mb-2">Approvals Dashboard</h1>
        <p className="text-fo-text-secondary">Review and manage your play approvals</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Link
          href="/client/approvals?status=pending_approval"
          className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
            statusFilter === 'pending_approval' ? 'border-fo-orange' : 'border-fo-light'
          } hover:shadow-lg transition-shadow`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-fo-text-secondary mb-1">Pending</p>
              <p className="text-3xl font-bold text-fo-dark">{stats.pending}</p>
            </div>
            <span className="text-4xl">⏳</span>
          </div>
        </Link>

        <Link
          href="/client/approvals?status=approved"
          className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
            statusFilter === 'approved' ? 'border-fo-green' : 'border-fo-light'
          } hover:shadow-lg transition-shadow`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-fo-text-secondary mb-1">Approved</p>
              <p className="text-3xl font-bold text-fo-dark">{stats.approved}</p>
            </div>
            <span className="text-4xl">✅</span>
          </div>
        </Link>

        <Link
          href="/client/approvals?status=rejected"
          className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
            statusFilter === 'rejected' ? 'border-red-500' : 'border-fo-light'
          } hover:shadow-lg transition-shadow`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-fo-text-secondary mb-1">Rejected</p>
              <p className="text-3xl font-bold text-fo-dark">{stats.rejected}</p>
            </div>
            <span className="text-4xl">❌</span>
          </div>
        </Link>

        <Link
          href="/client/approvals?status=draft"
          className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
            statusFilter === 'draft' ? 'border-fo-primary' : 'border-fo-light'
          } hover:shadow-lg transition-shadow`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-fo-text-secondary mb-1">Draft</p>
              <p className="text-3xl font-bold text-fo-dark">{stats.draft}</p>
            </div>
            <span className="text-4xl">📝</span>
          </div>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
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
              window.location.href = `/client/approvals?${params.toString()}`;
            }}
            className="px-4 py-2 border border-fo-light rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
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
              window.location.href = `/client/approvals?${params.toString()}`;
            }}
            className="px-4 py-2 border border-fo-light rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
          >
            <option value="all">All Categories</option>
            <option value="allbound">Allbound</option>
            <option value="outbound">Outbound</option>
            <option value="nurture">Nurture</option>
          </select>
        </div>
      </div>

      {/* Executions List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-fo-dark mb-4">Approval Requests</h2>
        
        {executions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-fo-text-secondary text-lg mb-4">No approvals found</p>
            <Link href="/client/allbound" className="text-fo-primary hover:underline">
              Create your first play →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {executions.map((execution) => {
              const statusBadge = getStatusBadge(execution.status);
              const approval = execution.play_approvals?.[0];
              
              return (
                <Link
                  key={execution.id}
                  href={`/client/approve/${approval?.shareable_token || execution.id}`}
                  className="block p-6 border border-fo-light rounded-lg hover:bg-fo-light transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono font-bold text-fo-primary bg-fo-primary/10 px-2 py-1 rounded">
                          {execution.claire_plays?.code || 'Unknown'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                        {approval?.due_date && isOverdue(approval.due_date) && (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">
                            ⚠️ Overdue
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-semibold text-fo-dark mb-2">
                        {execution.claire_plays?.name || 'Unknown Play'}
                      </h3>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-fo-text-secondary">
                        <span>Created: {formatDate(execution.created_at)}</span>
                        {execution.executed_at && (
                          <span>Executed: {formatDate(execution.executed_at)}</span>
                        )}
                        {approval?.due_date && (
                          <span className={isOverdue(approval.due_date) ? 'text-red-600 font-semibold' : ''}>
                            Due: {formatDate(approval.due_date)}
                          </span>
                        )}
                        {execution.approved_at && (
                          <span>Approved: {formatDate(execution.approved_at)}</span>
                        )}
                      </div>
                      
                      {approval?.comments && (
                        <p className="text-sm text-fo-text-secondary mt-2 italic">
                          &ldquo;{approval.comments}&rdquo;
                        </p>
                      )}
                    </div>
                    
                    <span className="text-2xl">→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

