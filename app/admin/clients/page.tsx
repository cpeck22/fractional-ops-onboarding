'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';

// Admin emails that can access this page
const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

interface Client {
  user_id: string;
  email: string;
  company_name: string | null;
  executions_count: number;
}

export default function AdminClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoadClients();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAdminAndLoadClients = async () => {
    try {
      // Check admin access
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/signin');
        return;
      }

      setCurrentUser(user.email || null);
      
      const isAdminUser = ADMIN_EMAILS.some(
        email => email.toLowerCase() === user.email?.toLowerCase()
      );

      if (!isAdminUser) {
        setIsAdmin(false);
        setLoading(false);
        toast.error('Unauthorized - Admin access required');
        return;
      }

      setIsAdmin(true);

      // Load clients
      const response = await fetch('/api/admin/claire-clients', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }

      const result = await response.json();

      if (result.success) {
        setClients(result.clients || []);
      } else {
        toast.error(result.error || 'Failed to load clients');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Failed to load clients');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fo-primary mx-auto mb-4"></div>
          <p className="text-fo-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-fo-dark mb-4">Unauthorized</h1>
          <p className="text-fo-text-secondary mb-4">You don&apos;t have permission to access this page.</p>
          <Link href="/admin" className="text-fo-primary hover:underline">← Back to Admin</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-fo-light to-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/admin" className="text-fo-primary hover:underline mb-4 inline-block">← Back to Admin</Link>
          <h1 className="text-3xl font-bold text-fo-dark mb-2">Client Portal Access</h1>
          <p className="text-fo-text-secondary">Access client Claire portals as an admin</p>
          <p className="text-sm text-fo-text-secondary mt-2">Logged in as: {currentUser}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-fo-light">
            <h2 className="text-xl font-bold text-fo-dark">All Clients</h2>
            <p className="text-sm text-fo-text-secondary mt-1">Click on a client to access their Claire portal</p>
          </div>
          
          {clients.length === 0 ? (
            <div className="p-8 text-center text-fo-text-secondary">
              No clients found
            </div>
          ) : (
            <div className="divide-y divide-fo-light">
              {clients.map((client) => (
                <Link
                  key={client.user_id}
                  href={`/client?impersonate=${client.user_id}`}
                  className="block p-6 hover:bg-fo-light/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-fo-dark mb-1">
                        {client.company_name || 'Unnamed Company'}
                      </h3>
                      <p className="text-sm text-fo-text-secondary">{client.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-fo-primary">{client.executions_count} plays</p>
                      <p className="text-xs text-fo-text-secondary mt-1">Click to access →</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

