'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase, signOut } from '@/lib/supabase';
import ProtectedRoute from '@/components/ProtectedRoute';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { LayoutDashboard, RefreshCw, Send, Heart, CheckCircle2, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';

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

  const navItems = [
    { href: '/client', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/client/allbound', label: 'Allbound', icon: RefreshCw },
    { href: '/client/outbound', label: 'Outbound', icon: Send },
    { href: '/client/nurture', label: 'Nurture', icon: Heart },
    { href: '/client/approvals', label: 'Approvals', icon: CheckCircle2 },
  ];

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

          <nav className="p-4 space-y-1 mt-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/client' && pathname?.startsWith(item.href));
              
              // Add impersonate parameter to all links if impersonating
              const href = impersonatedUserId 
                ? `${item.href}${item.href.includes('?') ? '&' : '?'}impersonate=${impersonatedUserId}`
                : item.href;
              
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.href}
                  href={href}
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
                  {pathname === '/client/allbound' && 'Allbound Plays'}
                  {pathname === '/client/outbound' && 'Outbound Plays'}
                  {pathname === '/client/nurture' && 'Nurture Plays'}
                  {pathname === '/client/approvals' && 'Approvals'}
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
      </div>
    </ProtectedRoute>
  );
}

