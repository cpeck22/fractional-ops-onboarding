'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, FileSpreadsheet, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { addImpersonateParam } from '@/lib/client-api-helpers';
import toast from 'react-hot-toast';

interface SelectListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (listId: string, listName: string) => void;
  impersonateUserId?: string | null;
}

interface List {
  id: string;
  name: string;
  type: 'account' | 'prospect';
  file_type: 'csv' | 'xlsx';
  row_count: number;
  status: 'draft' | 'approved';
  uploaded_at: string;
}

export default function SelectListModal({
  isOpen,
  onClose,
  onSelect,
  impersonateUserId
}: SelectListModalProps) {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const url = addImpersonateParam('/api/client/lists', impersonateUserId || null);
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
    if (isOpen) {
      loadLists();
    }
  }, [isOpen, loadLists]);

  const handleSelectList = () => {
    const selectedList = lists.find(l => l.id === selectedListId);
    if (selectedList) {
      onSelect(selectedList.id, selectedList.name);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-fo-border flex items-center justify-between bg-fo-light">
          <h3 className="text-lg font-semibold text-fo-dark">Select Existing List</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-fo-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 140px)' }}>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fo-primary mx-auto mb-4"></div>
              <p className="text-fo-text-secondary">Loading lists...</p>
            </div>
          ) : lists.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-16 h-16 text-fo-text-secondary mx-auto mb-4 opacity-50" />
              <h4 className="text-lg font-semibold text-fo-dark mb-2">No Lists Available</h4>
              <p className="text-fo-text-secondary">
                Upload lists in the Lists section to use them here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => setSelectedListId(list.id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedListId === list.id
                      ? 'border-fo-primary bg-fo-primary/5'
                      : 'border-fo-border hover:border-fo-primary/50 hover:bg-fo-light/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <FileSpreadsheet className="w-5 h-5 text-fo-primary" />
                      <div className="flex-1">
                        <div className="font-semibold text-fo-dark">{list.name}</div>
                        <div className="text-xs text-fo-text-secondary mt-1">
                          {list.type === 'account' ? 'Account List' : 'Prospect List'} • 
                          {list.file_type.toUpperCase()} • 
                          {list.row_count.toLocaleString()} rows • 
                          {new Date(list.uploaded_at).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        list.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {list.status === 'approved' ? 'Approved' : 'Draft'}
                      </span>
                    </div>
                    {selectedListId === list.id && (
                      <Check className="w-5 h-5 text-fo-primary ml-3" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-fo-border flex justify-end gap-3 bg-fo-light">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-fo-border text-fo-dark rounded-lg hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSelectList}
            disabled={!selectedListId}
            className="px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Select List
          </button>
        </div>
      </div>
    </div>
  );
}
