'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Play {
  code: string;
  name: string;
  category: string;
  documentation_status: string;
  content_agent_status: string;
  is_active: boolean;
}

export default function AllboundPlaysPage() {
  const [plays, setPlays] = useState<Play[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlays();
  }, []);

  const loadPlays = async () => {
    try {
      const response = await fetch('/api/client/plays?category=allbound', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setPlays(data.plays);
      } else {
        toast.error('Failed to load plays');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading plays:', error);
      toast.error('Failed to load plays');
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      'Completed': { color: 'bg-fo-green/20 text-fo-green', label: '✅ Ready' },
      'In Progress': { color: 'bg-fo-orange/20 text-fo-orange', label: '🔄 In Progress' },
      'Not Started': { color: 'bg-fo-light text-fo-text-secondary', label: '⏳ Coming Soon' },
      'REQUIRED': { color: 'bg-fo-primary/20 text-fo-primary', label: '⭐ Required' },
      'Placeholder For Review': { color: 'bg-yellow-100 text-yellow-800', label: '📋 Review' },
    };
    
    return badges[status] || { color: 'bg-fo-light text-fo-text-secondary', label: status };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fo-primary mx-auto mb-4"></div>
          <p className="text-fo-text-secondary">Loading plays...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-fo-dark mb-2">Allbound Plays</h1>
        <p className="text-fo-text-secondary">Trigger-based automations that respond to prospect activities</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plays.map((play) => {
          const statusBadge = getStatusBadge(play.content_agent_status || play.documentation_status);
          const isDisabled = play.documentation_status === 'Blocked' || 
                           (play.content_agent_status === 'Not Required' && play.documentation_status !== 'Completed');
          
          return (
            <Link
              key={play.code}
              href={isDisabled ? '#' : `/client/allbound/${play.code}`}
              className={`bg-white rounded-lg shadow-md p-6 border-2 transition-all ${
                isDisabled
                  ? 'border-fo-light opacity-60 cursor-not-allowed'
                  : 'border-fo-light hover:border-fo-primary hover:shadow-lg cursor-pointer'
              }`}
              onClick={(e) => {
                if (isDisabled) {
                  e.preventDefault();
                  toast.error('This play is not yet available');
                }
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-mono font-bold text-fo-primary bg-fo-primary/10 px-2 py-1 rounded">
                  {play.code}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${statusBadge.color}`}>
                  {statusBadge.label}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-fo-dark mb-2">
                {play.name}
              </h3>
              
              {isDisabled && (
                <p className="text-xs text-fo-text-secondary mt-2">
                  ⚠️ This play is currently unavailable
                </p>
              )}
            </Link>
          );
        })}
      </div>

      {plays.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-fo-text-secondary text-lg">No allbound plays available</p>
        </div>
      )}
    </div>
  );
}

