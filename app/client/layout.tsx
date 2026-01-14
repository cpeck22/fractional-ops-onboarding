'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ProtectedRoute from '@/components/ProtectedRoute';
import Image from 'next/image';
import Link from 'next/link';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // Check auth
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/signin');
      } else {
        setUser(user);
      }
    });
  }, [router]);

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
                    <p className="text-xs text-fo-text-secondary">CEO Dashboard</p>
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
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
              <div className="text-xs text-fo-text-secondary">
                <p className="font-semibold mb-1">Logged in as:</p>
                <p className="truncate">{user?.email || 'Loading...'}</p>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

