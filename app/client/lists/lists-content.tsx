'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { addImpersonateParam } from '@/lib/client-api-helpers';
import { Upload, FileSpreadsheet, Trash2, Download, Building2, Users as UsersIcon, Calendar } from 'lucide-react';

interface List {
  id: string;
  name: string;
  type: 'account' | 'prospect';
  file_type: 'csv' | 'xlsx';
  file_url: string;
  uploaded_at: string;
  row_count: number;
  status: 'draft' | 'approved';
}

export default function ListsPageContent() {
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'account' | 'prospect'>('account');
  const [uploading, setUploading] = useState(false);

  const loadLists = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam('/api/client/lists', impersonateUserId);
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setLists(result.lists || []);
      } else {
        toast.error(result.error || 'Failed to load lists');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading lists:', error);
      toast.error('Failed to load lists');
      setLoading(false);
    }
  }, [impersonateUserId]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(fileExtension)) {
      toast.error('Please upload a CSV or Excel (.xlsx) file');
      return;
    }

    setUploading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', activeTab);

      const url = addImpersonateParam('/api/client/lists/upload', impersonateUserId);
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('List uploaded successfully!');
        loadLists();
      } else {
        toast.error(result.error || 'Failed to upload list');
      }
    } catch (error) {
      console.error('Error uploading list:', error);
      toast.error('Failed to upload list');
    } finally {
      setUploading(false);
    }
  };

  const filteredLists = lists.filter(list => list.type === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fo-primary mx-auto mb-4"></div>
          <p className="text-fo-text-secondary">Loading lists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-fo-dark mb-2">Lists Repository</h1>
        <p className="text-fo-text-secondary">
          Manage your account lists and prospect lists for campaign launches
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-fo-border bg-white shadow-sm">
          <button
            onClick={() => setActiveTab('account')}
            className={`px-6 py-3 flex items-center gap-2 rounded-l-lg transition-colors ${
              activeTab === 'account'
                ? 'bg-fo-primary text-white'
                : 'text-fo-text-secondary hover:bg-fo-light'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="font-medium">Account Lists</span>
          </button>
          <button
            onClick={() => setActiveTab('prospect')}
            className={`px-6 py-3 flex items-center gap-2 rounded-r-lg border-l border-fo-border transition-colors ${
              activeTab === 'prospect'
                ? 'bg-fo-primary text-white'
                : 'text-fo-text-secondary hover:bg-fo-light'
            }`}
          >
            <UsersIcon className="w-4 h-4" />
            <span className="font-medium">Prospect Lists</span>
          </button>
        </div>

        {/* Upload Button */}
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary-dark transition-colors cursor-pointer">
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading...' : `Upload ${activeTab === 'account' ? 'Account' : 'Prospect'} List`}
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Lists Table */}
      <div className="bg-white rounded-lg shadow-sm border border-fo-border overflow-hidden">
        {filteredLists.length === 0 ? (
          <div className="p-12 text-center">
            <FileSpreadsheet className="w-16 h-16 text-fo-text-secondary mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-fo-dark mb-2">
              No {activeTab === 'account' ? 'Account' : 'Prospect'} Lists Yet
            </h3>
            <p className="text-fo-text-secondary mb-6">
              Upload a CSV or Excel file to get started
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-fo-light border-b border-fo-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase tracking-wider">
                  List Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase tracking-wider">
                  File Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase tracking-wider">
                  Rows
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-fo-dark uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fo-border">
              {filteredLists.map((list) => (
                <tr key={list.id} className="hover:bg-fo-light/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-fo-primary" />
                      <span className="text-sm font-medium text-fo-dark">{list.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-fo-text-secondary uppercase">
                      {list.file_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-fo-text-secondary">
                      {list.row_count.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      list.status === 'approved' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {list.status === 'approved' ? '✅ Approved' : '🟡 Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-fo-text-secondary">
                      <Calendar className="w-3 h-3" />
                      {new Date(list.uploaded_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="p-2 text-fo-primary hover:bg-fo-light rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          {activeTab === 'account' ? 'Account List Format' : 'Prospect List Format'}
        </h4>
        <p className="text-sm text-blue-700">
          {activeTab === 'account' ? (
            <>
              <strong>Recommended columns:</strong> Company Name, Company Domain, LinkedIn URL, Location, Headcount, Revenue
            </>
          ) : (
            <>
              <strong>Recommended columns:</strong> First Name, Last Name, Email, Title, Company Name, LinkedIn URL
            </>
          )}
        </p>
        <p className="text-xs text-blue-600 mt-2">
          Supported file types: CSV (.csv) and Excel (.xlsx)
        </p>
      </div>
    </div>
  );
}
