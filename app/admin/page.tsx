'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Logo from '../Fractional-Ops_Symbol_Main.png';

// Admin emails that can access this page
const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

interface AdminTool {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
}

const adminTools: AdminTool[] = [
  {
    id: 'strategies',
    title: 'View All Strategies',
    description: 'Browse and view all client strategies created by Claire',
    icon: '📊',
    href: '/admin/strategies',
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'rerun-agent',
    title: 'Rerun Agent',
    description: 'Regenerate specific agent outputs for a client (Call Prep, etc.)',
    icon: '🔄',
    href: '/admin/rerun-agent',
    color: 'from-orange-500 to-orange-600'
  }
];

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
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
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-2">You don&apos;t have permission to access the admin area.</p>
          <p className="text-gray-500 text-sm mb-6">Logged in as: {currentUser}</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image 
                src={Logo} 
                alt="Fractional Ops" 
                width={56} 
                height={56}
                className="rounded-lg shadow-sm"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-500 text-sm">Fractional Ops Internal Tools</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                🔓 Admin Access
              </span>
              <span className="text-sm text-gray-500">{currentUser}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Welcome, Admin 👋</h2>
          <p className="text-gray-600 text-lg">Select a tool to get started</p>
        </div>

        {/* Tools Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {adminTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => router.push(tool.href)}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden text-left border border-gray-100 hover:border-gray-200"
            >
              <div className={`bg-gradient-to-r ${tool.color} p-6`}>
                <span className="text-5xl">{tool.icon}</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-fo-primary transition-colors">
                  {tool.title}
                </h3>
                <p className="text-gray-600">{tool.description}</p>
                <div className="mt-4 flex items-center text-fo-primary font-semibold">
                  <span>Open Tool</span>
                  <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Quick Stats / Info */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Quick Tips</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>View Strategies:</strong> See all client strategies, search by email or company name</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Rerun Agent:</strong> Regenerate Call Prep or other outputs if quality is poor</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">💡</span>
              <span>Admin views don&apos;t trigger the 14-day timer for clients</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-gray-400">
        Fractional Ops Admin Portal • Built with Claire AI
      </div>
    </div>
  );
}

