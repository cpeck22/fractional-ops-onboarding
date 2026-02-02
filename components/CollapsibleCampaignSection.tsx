'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import ConfirmDeleteModal from './ConfirmDeleteModal';

interface CollapsibleCampaignSectionProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  onDelete?: (id: string) => void;
  isDeletable?: boolean;
}

export default function CollapsibleCampaignSection({
  id,
  title,
  icon,
  children,
  defaultExpanded = true,
  onDelete,
  isDeletable = true
}: CollapsibleCampaignSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(id);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <div id={id} className="border border-fo-border rounded-lg overflow-hidden bg-white scroll-mt-24">
        {/* Header */}
        <div className="bg-gradient-to-r from-fo-primary to-indigo-600 text-white px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
          >
            {icon}
            <span className="font-semibold text-lg">{title}</span>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 ml-auto" />
            ) : (
              <ChevronDown className="w-5 h-5 ml-auto" />
            )}
          </button>
          {isDeletable && onDelete && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="ml-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Delete section"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="p-6 bg-white">
            {children}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        itemName={title}
        itemType="section"
      />
    </>
  );
}
