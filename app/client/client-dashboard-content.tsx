'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalExecutions: number;
  pendingApproval: number;
  approved: number;
  draft: number;
}

export default function ClientDashboardContent() {
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  
  const [stats, setStats] = useState<DashboardStats>({
    totalExecutions: 0,
    pendingApproval: 0,
    approved: 0,
    draft: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentExecutions, setRecentExecutions] = useState<any[]>([]);

  const loadDashboardData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use impersonated user ID if admin is impersonating
      const effectiveUserId = impersonateUserId || user.id;

      // Fetch executions
      const { data: executions, error } = await supabase
        .from('play_executions')
        .select(`
          *,
          claire_plays (
            code,
            name,
            category
          )
        `)
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading executions:', error);
        return;
      }

      // Calculate stats
      const totalExecutions = executions?.length || 0;
      const pendingApproval = executions?.filter(e => e.status === 'pending_approval').length || 0;
      const approved = executions?.filter(e => e.status === 'approved').length || 0;
      const draft = executions?.filter(e => e.status === 'draft').length || 0;

      setStats({
        totalExecutions,
        pendingApproval,
        approved,
        draft
      });

      setRecentExecutions(executions || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
      setLoading(false);
    }
  }, [impersonateUserId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fo-primary mx-auto mb-4"></div>
          <p className="text-fo-text-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-fo-dark mb-2">Welcome to Claire Portal</h1>
        <p className="text-fo-text-secondary">Manage your AI-powered marketing plays and approvals</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Link href="/client/approvals?status=pending_approval" className="bg-white rounded-lg shadow-md p-6 border-l-4 border-fo-orange hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-fo-text-secondary mb-1">Pending Approval</p>
              <p className="text-3xl font-bold text-fo-dark">{stats.pendingApproval}</p>
            </div>
            <span className="text-4xl">⏳</span>
          </div>
        </Link>

        <Link href="/client/approvals?status=approved" className="bg-white rounded-lg shadow-md p-6 border-l-4 border-fo-green hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-fo-text-secondary mb-1">Approved</p>
              <p className="text-3xl font-bold text-fo-dark">{stats.approved}</p>
            </div>
            <span className="text-4xl">✅</span>
          </div>
        </Link>

        <Link href="/client/approvals?status=draft" className="bg-white rounded-lg shadow-md p-6 border-l-4 border-fo-primary hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-fo-text-secondary mb-1">Draft</p>
              <p className="text-3xl font-bold text-fo-dark">{stats.draft}</p>
            </div>
            <span className="text-4xl">📝</span>
          </div>
        </Link>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-fo-secondary hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-fo-text-secondary mb-1">Total Plays</p>
              <p className="text-3xl font-bold text-fo-dark">{stats.totalExecutions}</p>
            </div>
            <span className="text-4xl">🎯</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold text-fo-dark mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/client/allbound"
            className="p-4 border-2 border-fo-light rounded-lg hover:border-fo-primary hover:bg-fo-light transition-all"
          >
            <div className="text-2xl mb-2">🔄</div>
            <h3 className="font-semibold text-fo-dark mb-1">Allbound Plays</h3>
            <p className="text-sm text-fo-text-secondary">Trigger-based automations</p>
          </Link>

          <Link
            href="/client/outbound"
            className="p-4 border-2 border-fo-light rounded-lg hover:border-fo-primary hover:bg-fo-light transition-all"
          >
            <div className="text-2xl mb-2">📤</div>
            <h3 className="font-semibold text-fo-dark mb-1">Outbound Plays</h3>
            <p className="text-sm text-fo-text-secondary">Custom campaign playbooks</p>
          </Link>

          <Link
            href="/client/nurture"
            className="p-4 border-2 border-fo-light rounded-lg hover:border-fo-primary hover:bg-fo-light transition-all"
          >
            <div className="text-2xl mb-2">💚</div>
            <h3 className="font-semibold text-fo-dark mb-1">Nurture Plays</h3>
            <p className="text-sm text-fo-text-secondary">Ongoing nurture sequences</p>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-fo-dark mb-4">Recent Activity</h2>
        {recentExecutions.length === 0 ? (
          <p className="text-fo-text-secondary text-center py-8">
            No plays executed yet. <Link href="/client/allbound" className="text-fo-primary hover:underline">Get started</Link>
          </p>
        ) : (
          <div className="space-y-3">
            {recentExecutions.map((execution) => (
              <Link
                key={execution.id}
                href={`/client/${execution.claire_plays?.category || 'allbound'}/${execution.claire_plays?.code || 'unknown'}/${execution.id}`}
                className="flex items-center justify-between p-4 border border-fo-light rounded-lg hover:bg-fo-light transition-colors"
              >
                <div>
                  <p className="font-semibold text-fo-dark">
                    {execution.claire_plays?.name || `Play ${execution.claire_plays?.code || 'Unknown'}`}
                  </p>
                  <p className="text-sm text-fo-text-secondary">
                    {new Date(execution.created_at).toLocaleDateString()} • Status: {execution.status}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  execution.status === 'approved' ? 'bg-fo-green/20 text-fo-green' :
                  execution.status === 'pending_approval' ? 'bg-fo-orange/20 text-fo-orange' :
                  'bg-fo-light text-fo-text-secondary'
                }`}>
                  {execution.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

