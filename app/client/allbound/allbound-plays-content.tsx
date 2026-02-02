'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { addImpersonateParam } from '@/lib/client-api-helpers';
import { AlertTriangle, LayoutGrid, List } from 'lucide-react';
import { getPlayDescription } from '@/lib/play-descriptions';

interface Play {
  code: string;
  name: string;
  category: string;
  documentation_status: string;
  content_agent_status: string;
  is_active: boolean;
}

interface PlayWithStatus extends Play {
  executions: {
    draft: number;
    in_progress: number;
    approved: number;
    total: number;
  };
}

// Admin emails that can see all plays (including unavailable ones)
const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

// Plays that are hidden from client view
const HIDDEN_PLAYS_ALLBOUND = ['0007', '0001', '0009'];

export default function AllboundPlaysPageContent() {
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');
  const [plays, setPlays] = useState<PlayWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const loadPlays = useCallback(async () => {
    try {
      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      
      // Check if user is admin (but NOT when impersonating - show client view when impersonating)
      const { data: { user } } = await supabase.auth.getUser();
      const userIsAdmin = !impersonateUserId && !!(user?.email && ADMIN_EMAILS.some(
        email => email.toLowerCase() === user.email?.toLowerCase()
      ));
      setIsAdmin(userIsAdmin);

      // Load plays
      const url = addImpersonateParam('/api/client/plays?category=allbound', impersonateUserId);
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });
      const data = await response.json();
      
      if (!data.success) {
        toast.error('Failed to load plays');
        setLoading(false);
        return;
      }

      // Load execution statuses for each play
      const statusUrl = addImpersonateParam('/api/client/play-execution-statuses', impersonateUserId);
      const statusResponse = await fetch(statusUrl, {
        credentials: 'include',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });
      const statusData = await statusResponse.json();

      // Merge play data with execution statuses
      const playsWithStatus = data.plays.map((play: Play) => {
        const defaultStatus = { draft: 0, in_progress: 0, approved: 0, total: 0 };
        const playStatus = (statusData?.success && statusData?.statuses && statusData.statuses[play.code]) 
          ? statusData.statuses[play.code] 
          : defaultStatus;
        
        return {
          ...play,
          executions: playStatus || defaultStatus
        };
      });

      // Filter out hidden plays if user is not admin
      const filteredPlays = userIsAdmin 
        ? playsWithStatus 
        : playsWithStatus.filter((play: Play) => !HIDDEN_PLAYS_ALLBOUND.includes(play.code));

      setPlays(filteredPlays);
      setLoading(false);
    } catch (error) {
      console.error('Error loading plays:', error);
      toast.error('Failed to load plays');
      setLoading(false);
    }
  }, [impersonateUserId]);

  useEffect(() => {
    loadPlays();
  }, [loadPlays]);

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
      {/* View Toggle */}
      <div className="mb-6 flex justify-end items-center">
        <div className="inline-flex rounded-lg border border-fo-border bg-white shadow-sm">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 flex items-center gap-2 rounded-l-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-fo-primary text-white'
                : 'text-fo-text-secondary hover:bg-fo-light'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="text-sm font-medium">Icon View</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 flex items-center gap-2 rounded-r-lg border-l border-fo-border transition-colors ${
              viewMode === 'list'
                ? 'bg-fo-primary text-white'
                : 'text-fo-text-secondary hover:bg-fo-light'
            }`}
          >
            <List className="w-4 h-4" />
            <span className="text-sm font-medium">List View</span>
          </button>
        </div>
      </div>

      {/* Grid View (Icon View) */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plays.map((play) => {
          const isDisabled = play.documentation_status === 'Blocked' || 
                           (play.content_agent_status === 'Not Required' && play.documentation_status !== 'Completed');
          
          return (
            <Link
              key={play.code}
              href={isDisabled ? '#' : impersonateUserId 
                ? `/client/allbound/${play.code}?impersonate=${impersonateUserId}` 
                : `/client/allbound/${play.code}`
              }
              className={`bg-white rounded-lg shadow-sm p-6 border transition-all ${
                isDisabled
                  ? 'border-fo-border opacity-60 cursor-not-allowed'
                  : 'border-fo-border hover:border-fo-primary hover:shadow-md cursor-pointer'
              }`}
              onClick={(e) => {
                if (isDisabled) {
                  e.preventDefault();
                  toast.error('This play is not yet available');
                }
              }}
            >
              <div className="flex items-start mb-3">
                <span className="text-sm font-mono font-bold text-fo-primary bg-fo-primary/10 px-2 py-1 rounded">
                  {play.code}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-fo-dark mb-2">
                {play.name}
              </h3>
              
              {getPlayDescription(play.code) && (
                <p className="text-sm text-fo-text-secondary leading-relaxed mb-3">
                  {getPlayDescription(play.code)}
                </p>
              )}
              
              {/* Execution Status Badges */}
              {!isDisabled && play.executions && play.executions.total > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {play.executions.draft > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">
                      🟡 Draft ({play.executions.draft})
                    </span>
                  )}
                  {play.executions.in_progress > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                      📝 In Progress ({play.executions.in_progress})
                    </span>
                  )}
                  {play.executions.approved > 0 && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                      ✅ Approved ({play.executions.approved})
                    </span>
                  )}
                </div>
              )}
              
              {isDisabled && (
                <p className="text-xs text-fo-text-secondary mt-2">
                  <AlertTriangle className="w-4 h-4 inline mr-1" strokeWidth={2} />
                  This play is currently unavailable
                </p>
              )}
            </Link>
          );
        })}
        </div>
      )}

      {/* List View (Table View) */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border border-fo-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-fo-light border-b border-fo-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase tracking-wider">
                  Play #
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-fo-dark uppercase tracking-wider">
                  Draft
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-fo-dark uppercase tracking-wider">
                  In Progress
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-fo-dark uppercase tracking-wider">
                  Approved
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fo-border">
              {plays.map((play) => {
                const isDisabled = play.documentation_status === 'Blocked' || 
                                 (play.content_agent_status === 'Not Required' && play.documentation_status !== 'Completed');
                
                const RowComponent = isDisabled ? 'div' : Link;
                const rowProps = isDisabled 
                  ? {
                      className: 'table-row opacity-60 cursor-not-allowed',
                      onClick: () => toast.error('This play is not yet available')
                    }
                  : {
                      href: impersonateUserId 
                        ? `/client/allbound/${play.code}?impersonate=${impersonateUserId}` 
                        : `/client/allbound/${play.code}`,
                      className: 'table-row hover:bg-fo-light/50 transition-colors cursor-pointer'
                    };
                
                return (
                  <tr key={play.code} className={isDisabled ? 'opacity-60' : 'hover:bg-fo-light/50 transition-colors'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isDisabled ? (
                        <span className="text-sm font-mono font-bold text-fo-primary bg-fo-primary/10 px-2 py-1 rounded">
                          {play.code}
                        </span>
                      ) : (
                        <Link
                          href={impersonateUserId 
                            ? `/client/allbound/${play.code}?impersonate=${impersonateUserId}` 
                            : `/client/allbound/${play.code}`}
                          className="text-sm font-mono font-bold text-fo-primary bg-fo-primary/10 px-2 py-1 rounded hover:bg-fo-primary/20 transition-colors"
                        >
                          {play.code}
                        </Link>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isDisabled ? (
                        <div>
                          <div className="text-sm font-semibold text-fo-dark">{play.name}</div>
                          <div className="text-xs text-fo-text-secondary mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" strokeWidth={2} />
                            Currently unavailable
                          </div>
                        </div>
                      ) : (
                        <Link
                          href={impersonateUserId 
                            ? `/client/allbound/${play.code}?impersonate=${impersonateUserId}` 
                            : `/client/allbound/${play.code}`}
                          className="text-sm font-semibold text-fo-dark hover:text-fo-primary transition-colors"
                        >
                          {play.name}
                        </Link>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-fo-text-secondary line-clamp-2">
                        {getPlayDescription(play.code) || '—'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {!isDisabled && play.executions.draft > 0 ? (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold">
                          {play.executions.draft}
                        </span>
                      ) : (
                        <span className="text-fo-text-secondary text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {!isDisabled && play.executions.in_progress > 0 ? (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                          {play.executions.in_progress}
                        </span>
                      ) : (
                        <span className="text-fo-text-secondary text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {!isDisabled && play.executions.approved > 0 ? (
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                          {play.executions.approved}
                        </span>
                      ) : (
                        <span className="text-fo-text-secondary text-sm">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {plays.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-fo-border">
          <p className="text-fo-text-secondary text-lg">No allbound plays available</p>
        </div>
      )}
    </div>
  );
}

