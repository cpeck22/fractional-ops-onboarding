'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { addImpersonateParam } from '@/lib/client-api-helpers';
import { ChevronLeft, Loader2, CheckCircle } from 'lucide-react';

interface ListPreviewItem {
  account_name: string;
  prospect_name: string;
  job_title: string;
}

export default function ApproveListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const impersonateUserId = searchParams.get('impersonate');
  const campaignId = params.id as string;

  const [listPreview, setListPreview] = useState<ListPreviewItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    loadListPreview();
  }, [campaignId, impersonateUserId]);

  const loadListPreview = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam(`/api/client/campaigns/${campaignId}/preview-list`, impersonateUserId);
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });

      const result = await response.json();

      if (result.success) {
        setListPreview(result.listPreview || []);
        setTotalRecords(result.totalRecords || 0);
      } else {
        toast.error(result.error || 'Failed to load list preview');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading list preview:', error);
      toast.error('Failed to load list preview');
      setLoading(false);
    }
  };

  const handleApproveList = async () => {
    setApproving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam(`/api/client/campaigns/${campaignId}/approve-list`, impersonateUserId);
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
        toast.success('List approved!');
        // Redirect to copy approval
        const copyApprovalUrl = impersonateUserId
          ? `/client/campaigns/${campaignId}/approve-copy?impersonate=${impersonateUserId}`
          : `/client/campaigns/${campaignId}/approve-copy`;
        router.push(copyApprovalUrl);
      } else {
        toast.error(result.error || 'Failed to approve list');
      }
      setApproving(false);
    } catch (error) {
      console.error('Error approving list:', error);
      toast.error('Failed to approve list');
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-fo-primary mx-auto mb-4" />
          <p className="text-fo-text-secondary">Loading list preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-fo-dark mb-2">Approve Campaign List</h1>
        <p className="text-fo-text-secondary">
          Review the prospect list for this campaign. Total: {totalRecords} records
        </p>
      </div>

      {listPreview.length > 0 ? (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-fo-border overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-fo-light border-b border-fo-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase tracking-wider">
                      Account Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase tracking-wider">
                      Prospect Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase tracking-wider">
                      Job Title
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fo-border">
                  {listPreview.map((item, index) => (
                    <tr key={index} className="hover:bg-fo-light transition-colors">
                      <td className="px-6 py-4 text-sm text-fo-dark">
                        {item.account_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-fo-dark">
                        {item.prospect_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-fo-text-secondary">
                        {item.job_title || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleApproveList}
              disabled={approving}
              className="px-8 py-3 bg-fo-success text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-lg font-semibold"
            >
              {approving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Approve List
                </>
              )}
            </button>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-fo-border p-12 text-center">
          <p className="text-fo-text-secondary text-lg">No list available for preview</p>
        </div>
      )}
    </div>
  );
}
