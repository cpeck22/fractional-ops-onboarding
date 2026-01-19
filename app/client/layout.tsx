'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { supabase, signOut } from '@/lib/supabase';
import ProtectedRoute from '@/components/ProtectedRoute';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';

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

        // Load company name and workspace for impersonated user
        const { data: workspaceData, error: workspaceError } = await supabase
          .from('octave_outputs')
          .select('company_name, workspace_api_key')
          .eq('user_id', impersonateUserId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (workspaceError) {
          console.error('Error loading workspace for impersonated user:', workspaceError);
          setHasWorkspace(false);
        } else if (workspaceData) {
          setCompanyName(workspaceData.company_name);
          setHasWorkspace(!!workspaceData.workspace_api_key);
        } else {
          setHasWorkspace(false);
        }
      } else {
        // Normal user access
        setImpersonatedUserId(null);
        
        // Load company name and check for workspace from octave_outputs
        const { data: workspaceData, error } = await supabase
          .from('octave_outputs')
          .select('company_name, workspace_api_key')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (workspaceData) {
          setCompanyName(workspaceData.company_name);
          setHasWorkspace(!!workspaceData.workspace_api_key);
        } else {
          setHasWorkspace(false);
        }
      }
    };
    
    loadUserData();
  }, [router, searchParams]);

  const navItems = [
    { href: '/client', label: 'Dashboard', icon: '📊' },
    { href: '/client/allbound', label: 'Allbound', icon: '🔄' },
    { href: '/client/outbound', label: 'Outbound', icon: '📤' },
    { href: '/client/nurture', label: 'Nurture', icon: '💚' },
    { href: '/client/approvals', label: 'Approvals', icon: '✅' },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-fo-light to-white">
        {/* Sidebar Navigation */}
        <aside
          className={`fixed left-0 top-0 h-full bg-white shadow-lg transition-all duration-300 z-50 ${
            sidebarOpen ? 'w-64' : 'w-20'
          }`}
        >
          <div className="p-6 border-b border-fo-light">
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
                    <h1 className="text-lg font-bold text-fo-dark">Claire Portal</h1>
                    <p className="text-xs text-fo-text-secondary">
                      {companyName || 'CEO Dashboard'}
                    </p>
                  </div>
                </div>
              )}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-fo-light rounded-lg transition-colors"
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? '←' : '→'}
              </button>
            </div>
          </div>

          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/client' && pathname?.startsWith(item.href));
              
              // Add impersonate parameter to all links if impersonating
              const href = impersonatedUserId 
                ? `${item.href}${item.href.includes('?') ? '&' : '?'}impersonate=${impersonatedUserId}`
                : item.href;
              
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-fo-primary text-white font-semibold shadow-md'
                      : 'text-fo-text-secondary hover:bg-fo-light hover:text-fo-primary'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  {sidebarOpen && <span className="text-sm">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {sidebarOpen && (
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-fo-light">
              <div className="text-xs text-fo-text-secondary mb-3">
                <p className="font-semibold mb-1">Logged in as:</p>
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
                className="w-full px-3 py-2 bg-fo-light hover:bg-fo-primary hover:text-white text-fo-text-secondary rounded-lg text-xs font-semibold transition-all"
              >
                Sign Out
              </button>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
          <div className="p-8">
            {hasWorkspace === false ? (
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <div className="mb-6">
                    <div className="text-6xl mb-4">🎯</div>
                    <h1 className="text-3xl font-bold text-fo-dark mb-4">Welcome to Claire Portal</h1>
                    <p className="text-lg text-fo-text-secondary mb-8">
                      To access Claire&apos;s AI-powered marketing plays, you need to complete your onboarding questionnaire first.
                    </p>
                  </div>
                  
                  <div className="bg-fo-light/50 rounded-lg p-6 mb-8">
                    <h2 className="text-xl font-semibold text-fo-dark mb-4">What happens next?</h2>
                    <ul className="text-left space-y-3 text-fo-text-secondary">
                      <li className="flex items-start gap-3">
                        <span className="text-fo-primary font-bold">1.</span>
                        <span>Complete the onboarding questionnaire to set up your workspace</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-fo-primary font-bold">2.</span>
                        <span>We&apos;ll generate your personalized Octave workspace with all the necessary agents</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-fo-primary font-bold">3.</span>
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
    </ProtectedRoute>
  );
}

