'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Logo from '../../Fractional-Ops_Symbol_Main.png';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Admin emails that can access this page
const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
  // Add more admin emails as needed
];

interface Strategy {
  id: string;
  user_id: string;
  user_email: string;
  company_name: string;
  company_domain: string;
  created_at: string;
}

export default function AdminStrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [regenerateEmail, setRegenerateEmail] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateStatus, setRegenerateStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAdminAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('❌ No user logged in');
        router.push('/signin');
        return;
      }

      setCurrentUser(user.email || null);
      
      // Check if user is admin
      const isAdminUser = ADMIN_EMAILS.some(
        email => email.toLowerCase() === user.email?.toLowerCase()
      );

      if (!isAdminUser) {
        console.log('❌ User is not an admin:', user.email);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      console.log('✅ Admin access granted for:', user.email);
      setIsAdmin(true);
      await loadStrategies();
    } catch (error) {
      console.error('❌ Error checking admin access:', error);
      setLoading(false);
    }
  };

  const loadStrategies = async () => {
    try {
      // Add cache-busting query parameter
      const response = await fetch(`/api/admin/strategies?t=${Date.now()}`, {
        cache: 'no-store'
      });
      const data = await response.json();

      if (data.success) {
        console.log(`📊 API returned ${data.strategies.length} strategies`);
        setStrategies(data.strategies);
        console.log(`✅ Loaded ${data.strategies.length} strategies`);
      } else {
        console.error('❌ Failed to load strategies:', data.error);
      }
    } catch (error) {
      console.error('❌ Error loading strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateStrategy = async () => {
    if (!regenerateEmail.trim()) {
      setRegenerateStatus({ type: 'error', message: 'Please enter an email address' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(regenerateEmail.trim())) {
      setRegenerateStatus({ type: 'error', message: 'Please enter a valid email address' });
      return;
    }

    setIsRegenerating(true);
    setRegenerateStatus(null);

    try {
      console.log('🔄 Regenerating strategy for:', regenerateEmail.trim());
      
      const response = await fetch('/api/admin/regenerate-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regenerateEmail.trim() })
      });

      const data = await response.json();

      if (data.success) {
        setRegenerateStatus({ 
          type: 'success', 
          message: `✅ Strategy successfully regenerated for ${data.companyName || regenerateEmail.trim()}` 
        });
        setRegenerateEmail('');
        // Refresh the strategies list after a short delay
        setTimeout(() => {
          loadStrategies();
        }, 2000);
      } else {
        setRegenerateStatus({ 
          type: 'error', 
          message: `❌ ${data.error || 'Failed to regenerate strategy'}` 
        });
      }
    } catch (error: any) {
      console.error('❌ Regenerate strategy error:', error);
      setRegenerateStatus({ 
        type: 'error', 
        message: `❌ Error: ${error.message || 'Unknown error occurred'}` 
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  // Filter strategies by search term (handle null/undefined values)
  const filteredStrategies = strategies.filter(strategy => {
    if (!searchTerm) return true; // Show all if no search term
    const searchLower = searchTerm.toLowerCase();
    return (
      (strategy.company_name || '').toLowerCase().includes(searchLower) ||
      (strategy.user_email || '').toLowerCase().includes(searchLower) ||
      (strategy.company_domain || '').toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-fo-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading strategies...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-2">
            You don&apos;t have permission to view this page.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Logged in as: {currentUser}
          </p>
          <button
            onClick={() => router.push('/questionnaire')}
            className="px-6 py-3 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-bold transition-all"
          >
            Go to Questionnaire
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image 
                src={Logo} 
                alt="Fractional Ops" 
                width={48} 
                height={48}
                className="rounded"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-500 text-sm">View all client strategies</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setLoading(true);
                  loadStrategies();
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors flex items-center gap-2"
                disabled={loading}
              >
                {loading ? '⏳' : '🔄'} Refresh
              </button>
              <button
                onClick={() => router.push('/admin/rerun-agent')}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition-colors flex items-center gap-2"
              >
                🔄 Rerun Agent
              </button>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                🔓 Admin Access
              </span>
              <span className="text-sm text-gray-500">
                {currentUser}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="text-3xl font-bold text-fo-primary">{strategies.length}</div>
            <div className="text-gray-500 text-sm">Total Strategies</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="text-3xl font-bold text-fo-green">
              {strategies.filter(s => {
                const created = new Date(s.created_at);
                const now = new Date();
                const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays <= 7;
              }).length}
            </div>
            <div className="text-gray-500 text-sm">This Week</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="text-3xl font-bold text-fo-orange">
              {strategies.filter(s => {
                const created = new Date(s.created_at);
                const now = new Date();
                const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays <= 1;
              }).length}
            </div>
            <div className="text-gray-500 text-sm">Today</div>
          </div>
        </div>

        {/* Regenerate Strategy Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">🔄 Regenerate Claire Strategy</h2>
              <p className="text-gray-600 text-sm">
                Enter a user&apos;s email address to regenerate their complete strategy (Phase 1 + Phase 2).
                This will create fresh prospects and content. <strong>This process takes 3-5 minutes.</strong>
              </p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="email"
              placeholder="Enter user email address (e.g., ceo@company.com)..."
              value={regenerateEmail}
              onChange={(e) => {
                setRegenerateEmail(e.target.value);
                setRegenerateStatus(null); // Clear status when typing
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isRegenerating && regenerateEmail.trim()) {
                  handleRegenerateStrategy();
                }
              }}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              disabled={isRegenerating}
            />
            <button
              onClick={handleRegenerateStrategy}
              disabled={isRegenerating || !regenerateEmail.trim()}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[200px]"
            >
              {isRegenerating ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Regenerating...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>Regenerate Strategy</span>
                </>
              )}
            </button>
          </div>

          {regenerateStatus && (
            <div className={`mt-4 p-4 rounded-lg ${
              regenerateStatus.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <p className="font-medium">{regenerateStatus.message}</p>
              {regenerateStatus.type === 'success' && (
                <p className="text-sm mt-2 text-green-700">
                  The strategy list will refresh automatically. You can also click &quot;Refresh&quot; to see the updated list.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by company name, email, or domain..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-96 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-fo-primary focus:border-fo-primary outline-none"
          />
        </div>

        {/* Strategies Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    User Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStrategies.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm ? 'No strategies match your search' : 'No strategies generated yet'}
                    </td>
                  </tr>
                ) : (
                  filteredStrategies.map((strategy) => (
                    <tr key={strategy.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          {strategy.company_name || 'Unnamed Company'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {strategy.company_domain || 'No domain'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-700">{strategy.user_email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-700">
                          {new Date(strategy.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(strategy.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => router.push(`/admin/view-strategy/${strategy.user_id}`)}
                          className="px-4 py-2 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-medium text-sm transition-all inline-flex items-center gap-2"
                        >
                          <span>View Strategy</span>
                          <span>→</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>
            ⚠️ This view does NOT trigger the 14-day countdown timer for clients.
          </p>
          <p className="mt-1">
            The timer only starts when the client clicks &quot;Share Strategy&quot; on their dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}

