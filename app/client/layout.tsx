'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase, signOut } from '@/lib/supabase';
import ProtectedRoute from '@/components/ProtectedRoute';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { LayoutDashboard, RefreshCw, Send, Heart, CheckCircle2, ChevronLeft, ChevronRight, Menu, X, Settings, ChevronDown, ChevronUp, Target, FileText, BarChart3, Users, ListChecks, Building2, MessageCircle, Rocket, FileSpreadsheet } from 'lucide-react';

// Admin emails that can impersonate clients
const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<any>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [hasWorkspace, setHasWorkspace] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    management: false,
    allboundTactics: false,
    commandCentre: false,
  });
  
  // Admin UI states
  const [allClients, setAllClients] = useState<Array<{user_id: string; company_name: string; email: string}>>([]);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    // Check auth and handle impersonation
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/signin');
        return;
      }

      setUser(user);
      
      // Check if user is admin
      const isAdminUser = ADMIN_EMAILS.some(
        email => email.toLowerCase() === user.email?.toLowerCase()
      );
      setIsAdmin(isAdminUser);

      // Check for impersonation parameter
      const impersonateUserId = searchParams.get('impersonate');
      
      if (impersonateUserId && isAdminUser) {
        // Admin is impersonating a client
        setImpersonatedUserId(impersonateUserId);
        
        // Load impersonated user's data
        const { data: impersonatedUserData } = await supabase.auth.admin.getUserById(impersonateUserId);
        if (impersonatedUserData?.user) {
          setImpersonatedUser(impersonatedUserData.user);
        }

        // Use API endpoint to check workspace (bypasses RLS)
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const authToken = session?.access_token;
          
          const response = await fetch(
            `/api/client/check-workspace?impersonate=${impersonateUserId}`,
            {
              credentials: 'include',
              headers: {
                ...(authToken && { Authorization: `Bearer ${authToken}` })
              }
            }
          );
          
          const result = await response.json();
          
          if (result.success) {
            setCompanyName(result.companyName);
            setHasWorkspace(result.hasWorkspace);
          } else {
            console.error('Error loading workspace for impersonated user:', result.error);
            setHasWorkspace(false);
          }
        } catch (error) {
          console.error('Error checking workspace:', error);
          setHasWorkspace(false);
        }
      } else {
        // Normal user access
        setImpersonatedUserId(null);
        
        // Use API endpoint to check workspace
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const authToken = session?.access_token;
          
          const response = await fetch('/api/client/check-workspace', {
            credentials: 'include',
            headers: {
              ...(authToken && { Authorization: `Bearer ${authToken}` })
            }
          });
          
          const result = await response.json();
          
          if (result.success) {
            setCompanyName(result.companyName);
            setHasWorkspace(result.hasWorkspace);
          } else {
            console.error('Error loading workspace:', result.error);
            setHasWorkspace(false);
          }
        } catch (error) {
          console.error('Error checking workspace:', error);
          setHasWorkspace(false);
        }
      }
    };
    
    loadUserData();
  }, [router, searchParams]);

  // Load all clients for admin dropdown
  useEffect(() => {
    const loadAllClients = async () => {
      if (!isAdmin || !impersonatedUserId) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token;
        
        const response = await fetch('/api/admin/claire-clients', {
          credentials: 'include',
          headers: {
            ...(authToken && { Authorization: `Bearer ${authToken}` })
          }
        });
        
        const result = await response.json();
        
        if (result.success) {
          setAllClients(result.clients || []);
        }
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    };
    
    loadAllClients();
  }, [isAdmin, impersonatedUserId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Close client dropdown if clicking outside
      if (clientDropdownOpen && !target.closest('.client-dropdown')) {
        setClientDropdownOpen(false);
      }
      
      // Close user menu if clicking outside
      if (userMenuOpen && !target.closest('.user-menu')) {
        setUserMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clientDropdownOpen, userMenuOpen]);

  // Navigation structure with collapsible sections
  const navigationSections = [
    {
      id: 'management',
      label: 'Management',
      icon: LayoutDashboard,
      items: [
        { href: '/client', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/client/sales-plan', label: 'Sales Plan', icon: FileText, comingSoon: true },
        { href: '/client/gtm-strategy', label: 'GTM Strategy', icon: Target },
        { href: '/client/ask-claire', label: 'Ask Claire', icon: MessageCircle },
        { href: '/client/sales-intelligence', label: 'Sales Intelligence', icon: BarChart3, comingSoon: true },
      ],
    },
    {
      id: 'allboundTactics',
      label: 'Allbound Tactic Builder',
      icon: RefreshCw,
      items: [
        { href: '/client/allbound', label: 'Always On Signals', icon: RefreshCw },
        { href: '/client/outbound', label: 'Campaigns', icon: Send },
        { href: '/client/nurture', label: 'CRM Nurture', icon: Heart },
        { href: '/client/account-based-marketing', label: 'ABM', icon: Building2, comingSoon: true },
      ],
    },
    {
      id: 'commandCentre',
      label: 'Command Centre',
      icon: ListChecks,
      items: [
        { href: '/client/outbound-campaigns', label: 'Launch Status', icon: Rocket },
        { href: '/client/lists', label: 'Lists', icon: FileSpreadsheet },
      ],
    },
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  return (
    <ProtectedRoute>
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
                    src="/Fractional-Ops_Symbol_Main.png"
                    alt="Fractional Ops"
                    width={32}
                    height={32}
                    className="rounded"
                  />
                  <div>
                    <h1 className="text-lg font-bold text-white">Claire Portal</h1>
                    <p className="text-xs text-gray-400">
                      {companyName || 'CEO Dashboard'}
                    </p>
                  </div>
                </div>
              )}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-white"
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5" strokeWidth={2} />
                ) : (
                  <Menu className="w-5 h-5" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>

          <nav className="p-4 space-y-2 mt-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {navigationSections.map((section) => {
              const isExpanded = expandedSections[section.id];
              const SectionIcon = section.icon;
              
              return (
                <div key={section.id} className="space-y-1">
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition-all ${
                      isExpanded 
                        ? 'bg-gray-700/50 text-white' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {sidebarOpen && <span className="text-sm font-semibold">{section.label}</span>}
                      {!sidebarOpen && <SectionIcon className="w-5 h-5 flex-shrink-0" strokeWidth={2} />}
                    </div>
                    {sidebarOpen && (
                      isExpanded ? (
                        <ChevronUp className="w-4 h-4" strokeWidth={2} />
                      ) : (
                        <ChevronDown className="w-4 h-4" strokeWidth={2} />
                      )
                    )}
                  </button>
                  
                  {/* Section Items */}
                  {isExpanded && sidebarOpen && (
                    <div className="ml-4 space-y-1 border-l-2 border-gray-700 pl-2">
                      {section.items.map((item) => {
                        // ✅ FIX: Use exact matching for main routes, smart matching for sub-routes
                        // Exact match for the item itself
                        const exactMatch = pathname === item.href;
                        
                        // For sub-routes (like /client/outbound/0002), check if path starts with item href
                        // BUT exclude if another item has a more specific match
                        const isSubRoute = item.href !== '/client' && 
                          pathname?.startsWith(item.href + '/'); // ✅ Must have trailing slash!
                        
                        const isActive = exactMatch || isSubRoute;
                        
                        // Add impersonate parameter to all links if impersonating
                        const href = impersonatedUserId 
                          ? `${item.href}${item.href.includes('?') ? '&' : '?'}impersonate=${impersonatedUserId}`
                          : item.href;
                        
                        const ItemIcon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={href}
                            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                              isActive
                                ? 'bg-fo-primary text-white font-semibold shadow-sm'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            } ${item.comingSoon ? 'opacity-60 cursor-not-allowed' : ''}`}
                            onClick={(e) => {
                              if (item.comingSoon) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <ItemIcon className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                            <span className="text-sm font-medium flex-1">{item.label}</span>
                            {item.comingSoon && (
                              <span className="text-xs bg-gray-600 px-2 py-0.5 rounded">SOON</span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {sidebarOpen && (
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
              <div className="text-xs text-gray-400 mb-3">
                <p className="font-semibold mb-1 text-gray-300">Logged in as:</p>
                <p className="truncate">{user?.email || 'Loading...'}</p>
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
                  <Menu className="w-6 h-6" strokeWidth={2} />
                </button>
                <h2 className="text-xl font-semibold text-fo-dark">
                  {pathname === '/client' && 'Dashboard'}
                  {pathname === '/client/sales-plan' && 'Sales Plan'}
                  {pathname === '/client/gtm-strategy' && 'GTM Strategy'}
                  {pathname === '/client/sales-intelligence' && 'Sales Intelligence'}
                  {pathname === '/client/allbound' && 'Always On Signals'}
                  {pathname === '/client/outbound' && 'Campaigns'}
                  {pathname === '/client/nurture' && 'CRM Nurture'}
                  {pathname === '/client/outbound-campaigns' && 'Launch Status'}
                  {pathname === '/client/lists' && 'Lists'}
                  {pathname === '/client/account-based-marketing' && 'ABM'}
                  {pathname === '/client/approvals' && 'Reviews & Approvals'}
                  {pathname?.startsWith('/client/approve/') && 'Review Approval'}
                  {pathname?.match(/\/client\/(allbound|outbound|nurture)\/\d+/) && 'Play Execution'}
                </h2>
              </div>
              
              {/* Right side: Client Selector + User Menu */}
              <div className="flex items-center gap-4">
                {/* Client Selector Dropdown (Admin Impersonation Only) */}
                {isAdmin && impersonatedUserId ? (
                  <div className="relative client-dropdown">
                    <button
                      onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-medium text-fo-dark text-sm">
                        {companyName || 'Select Client'}
                      </span>
                      <ChevronDown className="w-4 h-4 text-fo-text-secondary" />
                    </button>
                    
                    {clientDropdownOpen && (
                      <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
                        <div className="p-2 border-b border-gray-100 bg-gray-50">
                          <p className="text-xs font-semibold text-fo-text-secondary uppercase">Switch Client</p>
                        </div>
                        {allClients.map(client => (
                          <button
                            key={client.user_id}
                            onClick={() => {
                              router.push(`${pathname}?impersonate=${client.user_id}`);
                              setClientDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                              client.user_id === impersonatedUserId ? 'bg-fo-light/30' : ''
                            }`}
                          >
                            <div className="font-medium text-fo-dark text-sm">{client.company_name || 'Unnamed Company'}</div>
                            <div className="text-xs text-fo-text-secondary mt-0.5">{client.email}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="hidden md:block text-sm text-fo-text-secondary">
                    {companyName && <span className="font-medium">{companyName}</span>}
                  </div>
                )}
                
                {/* User Profile Menu */}
                <div className="relative user-menu">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="w-8 h-8 rounded-full bg-fo-primary flex items-center justify-center text-white font-semibold text-sm shadow-sm hover:bg-fo-primary/90 transition-all"
                  >
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </button>
                  
                  {userMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-fo-dark truncate">
                          {user?.email}
                        </p>
                      </div>
                      
                      <div className="py-2">
                        {/* Future: Settings */}
                        <button
                          className="w-full px-4 py-2 text-left text-sm text-gray-400 cursor-not-allowed flex items-center gap-2"
                          disabled
                        >
                          <Settings className="w-4 h-4" />
                          Settings (Coming Soon)
                        </button>
                        
                        {/* Future: Change Password */}
                        <button
                          className="w-full px-4 py-2 text-left text-sm text-gray-400 cursor-not-allowed"
                          disabled
                        >
                          Change Password (Coming Soon)
                        </button>
                        
                        {/* Admin Panel - only for admins */}
                        {isAdmin && (
                          <Link
                            href="/admin"
                            className="block w-full px-4 py-2 text-left text-sm text-fo-dark hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100 mt-2 pt-2"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Settings className="w-4 h-4" />
                            Go to Admin Panel
                          </Link>
                        )}
                        
                        {/* Sign Out */}
                        <button
                          onClick={async () => {
                            setUserMenuOpen(false);
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
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 mt-2 transition-colors"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="bg-fo-bg-light min-h-[calc(100vh-73px)]">
            <div className="p-6 max-w-7xl mx-auto">
              {hasWorkspace === false ? (
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <div className="mb-6">
                    <h1 className="text-3xl font-bold text-fo-dark mb-4">Welcome to Claire Portal</h1>
                    <p className="text-lg font-normal text-fo-text-secondary mb-8">
                      To access Claire&apos;s AI-powered marketing plays, you need to complete your onboarding questionnaire first.
                    </p>
                  </div>
                  
                  <div className="bg-fo-light/50 rounded-lg p-6 mb-8">
                    <h2 className="text-xl font-semibold text-fo-dark mb-4">What happens next?</h2>
                    <ul className="text-left space-y-3 text-fo-text-secondary font-normal">
                      <li className="flex items-start gap-3">
                        <span className="text-fo-primary font-semibold">1.</span>
                        <span>Complete the onboarding questionnaire to set up your workspace</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-fo-primary font-semibold">2.</span>
                        <span>We&apos;ll generate your personalized Octave workspace with all the necessary agents</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-fo-primary font-semibold">3.</span>
                        <span>Access Claire Portal to run plays, generate content, and manage approvals</span>
                      </li>
                    </ul>
                  </div>
                  
                  <Link
                    href="/questionnaire"
                    className="inline-block px-8 py-4 bg-fo-primary text-white rounded-lg font-semibold hover:bg-opacity-90 transition-all shadow-md hover:shadow-lg"
                  >
                    Start Onboarding Questionnaire
                  </Link>
                  
                  <p className="mt-6 text-sm text-fo-text-secondary">
                    Already submitted? <Link href="/results" className="text-fo-primary hover:underline">Check your results</Link>
                  </p>
                </div>
              </div>
            ) : hasWorkspace === null ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fo-primary mx-auto mb-4"></div>
                  <p className="text-fo-text-secondary">Loading...</p>
                </div>
              </div>
            ) : (
              children
            )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

