'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase, signOut } from '@/lib/supabase';
import ProtectedRoute from '@/components/ProtectedRoute';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { LayoutDashboard, RefreshCw, Send, Heart, CheckCircle2, ChevronLeft, ChevronRight, Menu, X, Settings, ChevronDown, ChevronUp, Target, FileText, BarChart3, Users, ListChecks, Building2, MessageCircle, Rocket } from 'lucide-react';

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
    management: true,
    allboundTactics: true,
    commandCentre: true,
  });

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
        { href: '/client/allbound', label: 'Signal Based (Always On)', icon: RefreshCw },
        { href: '/client/outbound', label: 'Campaigns', icon: Send },
        { href: '/client/nurture', label: 'CRM Nurture', icon: Heart },
        { href: '/client/outbound-campaigns', label: 'Launch Status', icon: Rocket },
        { href: '/client/account-based-marketing', label: 'Account-Based Marketing', icon: Building2, comingSoon: true },
      ],
    },
    {
      id: 'commandCentre',
      label: 'Command Centre',
      icon: ListChecks,
      items: [
        { href: '/client/approvals', label: 'Reviews & Approvals', icon: CheckCircle2 },
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
                    className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <SectionIcon className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
                      {sidebarOpen && <span className="text-sm font-semibold">{section.label}</span>}
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
                        const isActive = pathname === item.href || 
                          (item.href !== '/client' && pathname?.startsWith(item.href));
                        
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
                  
                  {/* Collapsed view - show section icon only */}
                  {!sidebarOpen && (
                    <div className="ml-0">
                      <div className="flex items-center justify-center px-4 py-2">
                        <SectionIcon className="w-5 h-5 text-gray-300" strokeWidth={2} />
                      </div>
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
                  {pathname === '/client/allbound' && 'Signal Based (Always On)'}
                  {pathname === '/client/outbound' && 'Campaigns'}
                  {pathname === '/client/nurture' && 'CRM Nurture'}
                  {pathname === '/client/outbound-campaigns' && 'Launch Status'}
                  {pathname === '/client/account-based-marketing' && 'Account-Based Marketing'}
                  {pathname === '/client/approvals' && 'Reviews & Approvals'}
                  {pathname?.startsWith('/client/approve/') && 'Review Approval'}
                  {pathname?.match(/\/client\/(allbound|outbound|nurture)\/\d+/) && 'Play Execution'}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden md:block text-sm font-normal text-fo-text-secondary">
                  {companyName && <span className="font-medium">{companyName}</span>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden md:block text-sm text-fo-text-secondary">
                  {companyName && <span className="font-medium">{companyName}</span>}
                </div>
                <div className="w-8 h-8 rounded-full bg-fo-primary flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
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

        {/* Go to Admin Panel Button - Only shown when impersonating */}
        {impersonatedUserId && isAdmin && (
          <Link
            href="/admin"
            className="fixed bottom-6 right-6 bg-fo-primary hover:bg-fo-primary/90 text-white px-4 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 font-semibold text-sm z-50"
          >
            <Settings className="w-4 h-4" strokeWidth={2} />
            Go to Admin Panel
          </Link>
        )}
      </div>
    </ProtectedRoute>
  );
}

