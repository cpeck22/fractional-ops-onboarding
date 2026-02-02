'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType?: string;
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = 'item'
}: ConfirmDeleteModalProps) {
  const [deleteText, setDeleteText] = useState('');
  const isDeleteEnabled = deleteText === 'DELETE';

  const handleConfirm = () => {
    if (isDeleteEnabled) {
      onConfirm();
      setDeleteText('');
      onClose();
    }
  };

  const handleClose = () => {
    setDeleteText('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" strokeWidth={2} />
              </div>
              <h3 className="text-lg font-semibold text-fo-dark">Confirm Deletion</h3>
            </div>
            <button
              onClick={handleClose}
              className="text-fo-text-secondary hover:text-fo-dark transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-fo-text-secondary mb-2">
              Are you sure you want to delete <span className="font-semibold text-fo-dark">"{itemName}"</span>?
            </p>
            <p className="text-sm text-fo-text-secondary mb-4">
              This action cannot be undone. Please type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm.
            </p>
            
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-4 py-2 border border-fo-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
              autoFocus
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-fo-text-secondary hover:text-fo-dark font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isDeleteEnabled}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                isDeleteEnabled
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Delete {itemType}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
