'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Client {
  user_id: string;
  email: string;
  company_name: string | null;
  executions_count: number;
}

interface PlayExecution {
  id: string;
  play_id: string;
  status: string;
  created_at: string;
  claire_plays: {
    code: string;
    name: string;
    category: string;
  } | null | {
    code: string;
    name: string;
    category: string;
  }[];
}

export default function ClairePlaysAdminPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientPlays, setClientPlays] = useState<PlayExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlays, setLoadingPlays] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      
      // Get all unique clients who have executed plays
      // We'll use the service role key to bypass RLS
      const { data: executions, error: execError } = await supabase
        .from('play_executions')
        .select('user_id')
        .order('created_at', { ascending: false });

      if (execError) {
        console.error('Error loading executions:', execError);
        toast.error('Failed to load clients');
        setLoading(false);
        return;
      }

      // Get unique user IDs
      const uniqueUserIds = Array.from(new Set(executions?.map(e => e.user_id) || []));

      // Get all user emails at once using admin API
      const emailResponse = await fetch('/api/admin/client-emails', {
        credentials: 'include'
      }).catch(() => null);
      
      let userEmailsMap: Record<string, string> = {};
      if (emailResponse) {
        const emailData = await emailResponse.json();
        if (emailData.success && emailData.emails) {
          userEmailsMap = emailData.emails;
        }
      }

      // For each user, get their company info from octave_outputs
      const clientsData: Client[] = [];
      
      for (const userId of uniqueUserIds) {
        // Get company info from octave_outputs
        const { data: workspaceData } = await supabase
          .from('octave_outputs')
          .select('company_name')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Count executions for this user
        const executionsCount = executions?.filter(e => e.user_id === userId).length || 0;

        clientsData.push({
          user_id: userId,
          email: userEmailsMap[userId] || 'Unknown',
          company_name: workspaceData?.company_name || null,
          executions_count: executionsCount
        });
      }

      setClients(clientsData.sort((a, b) => b.executions_count - a.executions_count));
      setLoading(false);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Failed to load clients');
      setLoading(false);
    }
  };

  const loadClientPlays = async (userId: string) => {
    try {
      setLoadingPlays(true);
      setSelectedClient(userId);

      const { data: plays, error } = await supabase
        .from('play_executions')
        .select(`
          id,
          play_id,
          status,
          created_at,
          claire_plays (
            code,
            name,
            category
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading client plays:', error);
        toast.error('Failed to load plays');
        return;
      }

      // Transform the data to handle Supabase's array response for relations
      const transformedPlays: PlayExecution[] = (plays || []).map((play: any) => ({
        id: play.id,
        play_id: play.play_id,
        status: play.status,
        created_at: play.created_at,
        claire_plays: Array.isArray(play.claire_plays) 
          ? play.claire_plays[0] || null 
          : play.claire_plays
      }));

      setClientPlays(transformedPlays);
      setLoadingPlays(false);
    } catch (error) {
      console.error('Error loading client plays:', error);
      toast.error('Failed to load plays');
      setLoadingPlays(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fo-primary mx-auto mb-4"></div>
          <p className="text-fo-text-secondary">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-fo-light to-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-fo-dark mb-2">Claire Plays Management</h1>
          <p className="text-fo-text-secondary">View all clients and their play executions</p>
        </div>

        {!selectedClient ? (
          // Clients List View
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-fo-light">
              <h2 className="text-xl font-bold text-fo-dark">View All Clients</h2>
              <p className="text-sm text-fo-text-secondary mt-1">Select a client to view their plays</p>
            </div>
            <div className="divide-y divide-fo-light">
              {clients.length === 0 ? (
                <div className="p-8 text-center text-fo-text-secondary">
                  No clients found
                </div>
              ) : (
                clients.map((client) => (
                  <div
                    key={client.user_id}
                    onClick={() => loadClientPlays(client.user_id)}
                    className="p-6 hover:bg-fo-light/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-fo-dark">
                          {client.company_name || client.email}
                        </h3>
                        <p className="text-sm text-fo-text-secondary mt-1">{client.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-fo-primary">
                          {client.executions_count} {client.executions_count === 1 ? 'Play' : 'Plays'}
                        </p>
                        <span className="text-xs text-fo-text-secondary">Click to view →</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          // Client Plays View
          <div>
            <button
              onClick={() => {
                setSelectedClient(null);
                setClientPlays([]);
              }}
              className="mb-4 text-fo-primary hover:underline flex items-center gap-2"
            >
              ← Back to Clients
            </button>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-fo-light">
                <h2 className="text-xl font-bold text-fo-dark">
                  Plays for {clients.find(c => c.user_id === selectedClient)?.company_name || clients.find(c => c.user_id === selectedClient)?.email}
                </h2>
                <p className="text-sm text-fo-text-secondary mt-1">
                  {clients.find(c => c.user_id === selectedClient)?.email}
                </p>
              </div>

              {loadingPlays ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fo-primary mx-auto mb-4"></div>
                  <p className="text-fo-text-secondary">Loading plays...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-fo-light">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase">Play Code</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase">Play Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-fo-light">
                      {clientPlays.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-fo-text-secondary">
                            No plays executed yet
                          </td>
                        </tr>
                      ) : (
                        clientPlays.map((play) => (
                          <tr key={play.id} className="hover:bg-fo-light/50">
                            <td className="px-6 py-4 text-sm font-mono font-bold text-fo-primary">
                              {play.claire_plays?.code || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-fo-dark">
                              {play.claire_plays?.name || 'Unknown Play'}
                            </td>
                            <td className="px-6 py-4 text-sm text-fo-text-secondary capitalize">
                              {play.claire_plays?.category || 'N/A'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                play.status === 'approved' ? 'bg-fo-green/20 text-fo-green' :
                                play.status === 'pending_approval' ? 'bg-fo-orange/20 text-fo-orange' :
                                play.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-fo-light text-fo-text-secondary'
                              }`}>
                                {play.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-fo-text-secondary">
                              {new Date(play.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
