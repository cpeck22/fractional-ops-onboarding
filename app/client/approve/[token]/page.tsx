'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Execution {
  id: string;
  status: string;
  output: any;
  edited_output: any;
  runtime_context: any;
  created_at: string;
  claire_plays: {
    code: string;
    name: string;
    category: string;
  };
}

interface Approval {
  id: string;
  status: string;
  due_date: string;
  comments: string;
}

export default function ApprovalPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const impersonateUserId = searchParams.get('impersonate');

  const [execution, setExecution] = useState<Execution | null>(null);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [comments, setComments] = useState('');

  const loadApproval = useCallback(async () => {
    try {
      // First, verify user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/signin?redirect=/client/approve/${token}`);
        return;
      }

      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      // Fetch approval by token
      const response = await fetch(`/api/client/approve/${token}`, {
        credentials: 'include',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });
      const data = await response.json();

      if (data.success) {
        setExecution(data.execution);
        setApproval(data.approval);
      } else {
        toast.error(data.error || 'Approval not found');
        router.push('/client/approvals');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading approval:', error);
      toast.error('Failed to load approval');
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    loadApproval();
  }, [loadApproval]);

  const handleApprove = async () => {
    if (!approval) return;

    setApproving(true);
    try {
      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const response = await fetch('/api/client/approve', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          approvalId: approval.id,
          status: 'approved',
          comments: comments.trim() || null
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Approval submitted successfully!');
        setTimeout(() => {
          router.push(impersonateUserId 
            ? `/client/approvals?impersonate=${impersonateUserId}` 
            : '/client/approvals'
          );
        }, 1500);
      } else {
        toast.error(result.error || 'Failed to approve');
      }
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Failed to approve');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!approval || !comments.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setRejecting(true);
    try {
      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const response = await fetch('/api/client/approve', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          approvalId: approval.id,
          status: 'rejected',
          comments: comments.trim()
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Rejection submitted successfully!');
        setTimeout(() => {
          router.push(impersonateUserId 
            ? `/client/approvals?impersonate=${impersonateUserId}` 
            : '/client/approvals'
          );
        }, 1500);
      } else {
        toast.error(result.error || 'Failed to reject');
      }
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Failed to reject');
    } finally {
      setRejecting(false);
    }
  };

  const highlightVariables = (text: string) => {
    const octavePattern = /\{\{(persona|use_case|reference|competitor|lead_magnet|segment)\}\}/gi;
    const assumptionPattern = /\{\{(problem|solution|pain_point|benefit|challenge)\}\}/gi;
    
    let highlighted = text
      .replace(octavePattern, (match) => `<span class="bg-fo-primary/20 text-fo-primary font-semibold px-1 rounded">${match}</span>`)
      .replace(assumptionPattern, (match) => `<span class="bg-fo-orange/20 text-fo-orange font-semibold px-1 rounded">${match}</span>`);
    
    return highlighted;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fo-primary mx-auto mb-4"></div>
          <p className="text-fo-text-secondary">Loading approval...</p>
        </div>
      </div>
    );
  }

  if (!execution || !approval) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-fo-border">
        <p className="text-fo-text-secondary text-lg mb-4">Approval not found</p>
        <Link 
          href={impersonateUserId 
            ? `/client/approvals?impersonate=${impersonateUserId}` 
            : '/client/approvals'
          } 
          className="text-fo-primary hover:underline"
        >
          ← Back to approvals
        </Link>
      </div>
    );
  }

  const outputContent = execution.edited_output?.content || execution.output?.content || JSON.stringify(execution.output || {}, null, 2);
  const isOverdue = approval.due_date && new Date(approval.due_date) < new Date();
  const canApprove = approval.status === 'pending';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <Link 
          href={impersonateUserId 
            ? `/client/approvals?impersonate=${impersonateUserId}` 
            : '/client/approvals'
          } 
          className="text-fo-primary hover:underline mb-4 inline-block"
        >
          ← Back to approvals
        </Link>
        <h1 className="text-2xl font-semibold text-fo-dark mb-2">Review Approval Request</h1>
        <p className="text-fo-text-secondary">
          Play: {execution.claire_plays?.name} ({execution.claire_plays?.code})
        </p>
      </div>

      {/* Status Banner */}
      <div className={`bg-white rounded-lg shadow-sm p-6 mb-6 border ${
        approval.status === 'approved' ? 'border-fo-green' :
        approval.status === 'rejected' ? 'border-fo-tertiary-4' :
        isOverdue ? 'border-fo-tertiary-4' :
        'border-fo-orange'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-fo-dark mb-2">
              {approval.status === 'approved' ? '✅ Approved' :
               approval.status === 'rejected' ? '❌ Rejected' :
               isOverdue ? '⚠️ Overdue - Action Required' :
               '⏳ Pending Approval'}
            </h2>
            {approval.due_date && (
              <p className="text-sm text-fo-text-secondary">
                Due Date: {new Date(approval.due_date).toLocaleDateString()}
                {isOverdue && <span className="text-fo-tertiary-4 font-semibold ml-2">(Overdue)</span>}
              </p>
            )}
          </div>
          <span className={`px-4 py-2 rounded-lg font-semibold ${
            approval.status === 'approved' ? 'bg-fo-green/20 text-fo-green' :
            approval.status === 'rejected' ? 'bg-fo-tertiary-4/20 text-fo-tertiary-4' :
            'bg-fo-orange/20 text-fo-orange'
          }`}>
            {approval.status}
          </span>
        </div>
      </div>

      {/* Output Display */}
      <div className="bg-white rounded-lg shadow-sm p-8 mb-6 border border-fo-border">
        <h2 className="text-lg font-semibold text-fo-dark mb-4">Generated Output</h2>
        <div 
          className="prose max-w-none bg-fo-light/30 p-6 rounded-lg whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ 
            __html: highlightVariables(outputContent)
          }}
        />
      </div>

      {/* Variable Legend */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-fo-border">
        <h3 className="text-base font-semibold text-fo-dark mb-4">Variable Legend</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold text-fo-dark mb-2">Octave Elements</p>
            <div className="space-y-1">
              <span className="inline-block bg-fo-primary/20 text-fo-primary px-2 py-1 rounded text-xs mr-2">persona</span>
              <span className="inline-block bg-fo-primary/20 text-fo-primary px-2 py-1 rounded text-xs mr-2">use_case</span>
              <span className="inline-block bg-fo-primary/20 text-fo-primary px-2 py-1 rounded text-xs mr-2">reference</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-fo-dark mb-2">Assumptions/Messaging</p>
            <div className="space-y-1">
              <span className="inline-block bg-fo-orange/20 text-fo-orange px-2 py-1 rounded text-xs mr-2">problem</span>
              <span className="inline-block bg-fo-orange/20 text-fo-orange px-2 py-1 rounded text-xs mr-2">solution</span>
              <span className="inline-block bg-fo-orange/20 text-fo-orange px-2 py-1 rounded text-xs mr-2">pain_point</span>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Actions */}
      {canApprove && (
        <div className="bg-white rounded-lg shadow-sm p-8 border border-fo-border">
          <h2 className="text-lg font-semibold text-fo-dark mb-4">Your Decision</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-semibold text-fo-dark mb-2">
              Comments {approval.status === 'pending' && <span className="text-fo-text-secondary">(Optional for approval, required for rejection)</span>}
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add your comments or feedback..."
              rows={4}
              className="w-full px-4 py-2 border border-fo-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-fo-primary"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleApprove}
              disabled={approving}
              className="flex-1 px-6 py-3 bg-fo-green text-white rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 transition-all"
            >
              {approving ? 'Approving...' : '✅ Approve'}
            </button>
            <button
              onClick={handleReject}
              disabled={rejecting || !comments.trim()}
              className="flex-1 px-6 py-3 bg-fo-tertiary-4 text-white rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50 transition-all"
            >
              {rejecting ? 'Rejecting...' : '❌ Reject'}
            </button>
          </div>
        </div>
      )}

      {/* Already Processed */}
      {!canApprove && (
        <div className="bg-white rounded-lg shadow-md p-8">
          <p className="text-fo-text-secondary text-center">
            This approval has already been {approval.status}.
            {approval.comments && (
              <span className="block mt-2 italic">&ldquo;{approval.comments}&rdquo;</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

