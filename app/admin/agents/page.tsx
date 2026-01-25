'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase, signOut } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import Logo from '../../Fractional-Ops_Symbol_Main.png';
import toast from 'react-hot-toast';
import { LayoutDashboard, RefreshCw, Target, Users, Lock, Bot, Copy, CheckCircle } from 'lucide-react';
import { WORKSPACE_AGENTS, getAgentsByCategory, type WorkspaceAgent } from '@/lib/workspace-agents';

// Admin emails that can access this page
const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

export default function AgentManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedAgentId, setCopiedAgentId] = useState<string | null>(null);

  const checkAdminAccess = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/signin');
        return;
      }

      setCurrentUser(user.email || null);
      
      const isAdminUser = ADMIN_EMAILS.some(
        email => email.toLowerCase() === user.email?.toLowerCase()
      );

      setIsAdmin(isAdminUser);
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  const copyToClipboard = (text: string, agentId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAgentId(agentId);
    toast.success('Agent ID copied to clipboard');
    setTimeout(() => setCopiedAgentId(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-fo-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-6" strokeWidth={1.5} />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 font-normal mb-2">You don&apos;t have permission to access the admin area.</p>
          <p className="text-gray-500 text-sm font-normal mb-6">Logged in as: {currentUser}</p>
          <button
            onClick={() => router.push('/questionnaire')}
            className="px-6 py-3 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-bold"
          >
            Go to Questionnaire
          </button>
        </div>
      </div>
    );
  }

  const adminNavItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/strategies', label: 'Strategies', icon: LayoutDashboard },
    { href: '/admin/rerun-agent', label: 'Rerun Agent', icon: RefreshCw },
    { href: '/admin/claire-plays', label: 'Claire Plays', icon: Target },
    { href: '/admin/clients', label: 'Clients', icon: Users },
    { href: '/admin/agents', label: 'Agent Management', icon: Bot },
  ];

  const agentsByCategory = getAgentsByCategory();

  return (
    <div className="min-h-screen bg-fo-bg-light flex">
      {/* Dark Gray Sidebar Navigation */}
      <aside
        className={`fixed left-0 top-0 h-full bg-fo-sidebar-dark shadow-xl transition-all duration-300 z-50 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-3">
                <Image
                  src={Logo}
                  alt="Fractional Ops"
                  width={32}
                  height={32}
                  className="rounded"
                />
                <div>
                  <h1 className="text-lg font-bold text-white">Admin Portal</h1>
                  <p className="text-xs text-gray-400">Fractional Ops</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-white"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        <nav className="p-4 space-y-1 mt-4">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/admin' && pathname?.startsWith(item.href));
            const IconComponent = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-fo-primary text-white font-semibold shadow-sm'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <IconComponent className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {sidebarOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
            <div className="text-xs text-gray-400 mb-3">
              <p className="font-semibold mb-1 text-gray-300">Logged in as:</p>
              <p className="truncate">{currentUser || 'Loading...'}</p>
            </div>
            <button
              onClick={async () => {
                try {
                  const { error } = await signOut();
                  if (error) {
                    toast.error('Failed to sign out');
                  } else {
                    toast.success('Signed out successfully');
                    router.push('/signin');
                  }
                } catch (error) {
                  console.error('Error signing out:', error);
                  toast.error('Failed to sign out');
                }
              }}
              className="w-full px-3 py-2 bg-gray-700 hover:bg-fo-primary text-gray-200 rounded-lg text-xs font-semibold transition-all"
            >
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-fo-border shadow-sm sticky top-0 z-40">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-fo-bg-light rounded-lg transition-colors text-fo-text-secondary hover:text-fo-dark lg:hidden"
                aria-label="Toggle sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h2 className="text-xl font-semibold text-fo-dark">Claire Agent Management</h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden md:block px-3 py-1 bg-fo-primary/10 text-fo-primary rounded-full text-sm font-medium inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" strokeWidth={2} />
                Admin Access
              </span>
              <div className="w-8 h-8 rounded-full bg-fo-primary flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {currentUser?.charAt(0).toUpperCase() || 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="bg-fo-bg-light min-h-[calc(100vh-73px)]">
          <div className="p-6 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-fo-dark mb-2">Claire Agent Management Tool</h1>
              <p className="text-fo-text-secondary">
                View all agents that are duplicated when creating a new workspace via /generate-workspace
              </p>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Total Agents:</strong> {WORKSPACE_AGENTS.length} agents are configured to be duplicated
                </p>
              </div>
            </div>

            {/* Agents by Category */}
            {Object.entries(agentsByCategory).map(([category, agents]) => (
              <div key={category} className="mb-8 bg-white rounded-lg shadow-sm border border-fo-border overflow-hidden">
                <div className="bg-gradient-to-r from-fo-primary to-fo-secondary p-4">
                  <h2 className="text-xl font-bold text-white">
                    {category} ({agents.length})
                  </h2>
                </div>
                <div className="divide-y divide-fo-border">
                  {agents.map((agent, index) => (
                    <div
                      key={agent.id}
                      className="p-4 hover:bg-fo-bg-light transition-colors flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-fo-text-secondary w-12">
                            #{index + 1}
                          </span>
                          <div className="flex-1">
                            <div className="font-mono text-sm text-fo-dark font-semibold">
                              {agent.id}
                            </div>
                            {agent.name && (
                              <div className="text-sm text-fo-text-secondary mt-1">
                                {agent.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(agent.id, agent.id)}
                        className="ml-4 p-2 hover:bg-fo-bg-light rounded-lg transition-colors text-fo-text-secondary hover:text-fo-primary"
                        title="Copy agent ID"
                      >
                        {copiedAgentId === agent.id ? (
                          <CheckCircle className="w-5 h-5 text-green-500" strokeWidth={2} />
                        ) : (
                          <Copy className="w-5 h-5" strokeWidth={2} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Info Section */}
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-fo-border p-6">
              <h3 className="font-bold text-fo-dark mb-4">About This Tool</h3>
              <ul className="space-y-2 text-sm text-fo-text-secondary">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-fo-primary mt-0.5 flex-shrink-0" strokeWidth={2} />
                  <span>
                    <strong className="font-semibold">Agent IDs:</strong> These are the agent IDs that are duplicated from the source workspace to each new client workspace
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-fo-primary mt-0.5 flex-shrink-0" strokeWidth={2} />
                  <span>
                    <strong className="font-semibold">Categories:</strong> Agents are grouped by their function (Prospector, Cold Email, LinkedIn Post, etc.)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-fo-primary mt-0.5 flex-shrink-0" strokeWidth={2} />
                  <span>
                    <strong className="font-semibold">Agent Names:</strong> Names will be added later to make identification easier
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-fo-primary mt-0.5 flex-shrink-0" strokeWidth={2} />
                  <span>
                    <strong className="font-semibold">Copy:</strong> Click the copy icon to copy an agent ID to your clipboard
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

