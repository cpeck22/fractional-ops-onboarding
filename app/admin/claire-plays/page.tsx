'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Bot, FileText, ChevronDown, ChevronUp, Copy, CheckCircle, X } from 'lucide-react';

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
  } | null;
}

interface PlayCatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  agent_id: string | null;
  prompt_template: string | null;
  hasPromptConfig: boolean;
  variableCount: number;
  documentation_status: string | null;
  content_agent_status: string | null;
  is_active: boolean;
}

export default function ClairePlaysAdminPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientPlays, setClientPlays] = useState<PlayExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlays, setLoadingPlays] = useState(false);
  const [activeTab, setActiveTab] = useState<'executions' | 'catalog'>('executions');
  const [playCatalog, setPlayCatalog] = useState<PlayCatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [expandedPlay, setExpandedPlay] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (activeTab === 'catalog') {
      loadPlayCatalog();
    }
  }, [activeTab]);

  const loadPlayCatalog = async () => {
    try {
      setLoadingCatalog(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      
      const response = await fetch('/api/admin/plays-catalog', {
        credentials: 'include',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch play catalog');
      }

      const result = await response.json();

      if (result.success) {
        setPlayCatalog(result.plays || []);
      } else {
        toast.error(result.error || 'Failed to load play catalog');
      }

      setLoadingCatalog(false);
    } catch (error) {
      console.error('Error loading play catalog:', error);
      toast.error('Failed to load play catalog');
      setLoadingCatalog(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const loadClients = async () => {
    try {
      setLoading(true);
      
      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      
      // Use admin API endpoint to get all clients (bypasses RLS)
      const response = await fetch('/api/admin/claire-clients', {
        credentials: 'include',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
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

  const loadClientPlays = async (userId: string) => {
    try {
      setLoadingPlays(true);
      setSelectedClient(userId);

      // Get session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      // Use admin API endpoint to get client plays (bypasses RLS)
      const response = await fetch(`/api/admin/claire-client-plays?userId=${userId}`, {
        credentials: 'include',
        headers: {
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch plays');
      }

      const result = await response.json();

      if (result.success) {
        setClientPlays(result.plays || []);
      } else {
        toast.error(result.error || 'Failed to load plays');
      }

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
          <p className="text-fo-text-secondary">View all clients and their play executions, or manage the play catalog</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-4 border-b border-fo-border">
          <button
            onClick={() => setActiveTab('executions')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'executions'
                ? 'text-fo-primary border-b-2 border-fo-primary'
                : 'text-fo-text-secondary hover:text-fo-dark'
            }`}
          >
            Client Executions
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'catalog'
                ? 'text-fo-primary border-b-2 border-fo-primary'
                : 'text-fo-text-secondary hover:text-fo-dark'
            }`}
          >
            Play Catalog
          </button>
        </div>

        {activeTab === 'catalog' ? (
          // Play Catalog View
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b border-fo-light">
              <h2 className="text-xl font-bold text-fo-dark">Play Catalog</h2>
              <p className="text-sm text-fo-text-secondary mt-1">
                View all plays with their agent IDs and prompt templates
              </p>
            </div>

            {loadingCatalog ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fo-primary mx-auto mb-4"></div>
                <p className="text-fo-text-secondary">Loading play catalog...</p>
              </div>
            ) : (
              <div className="divide-y divide-fo-light">
                {playCatalog.length === 0 ? (
                  <div className="p-8 text-center text-fo-text-secondary">
                    No plays found
                  </div>
                ) : (
                  playCatalog.map((play) => {
                    const isExpanded = expandedPlay === play.code;
                    return (
                      <div key={play.id} className="p-6 hover:bg-fo-light/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-mono font-bold text-fo-primary text-lg">
                                {play.code}
                              </span>
                              <h3 className="text-lg font-semibold text-fo-dark">
                                {play.name}
                              </h3>
                              <span className="px-2 py-1 bg-fo-light text-fo-text-secondary rounded text-xs font-semibold capitalize">
                                {play.category}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-4 mt-3 text-sm">
                              {play.agent_id && (
                                <div className="flex items-center gap-2">
                                  <Bot className="w-4 h-4 text-fo-text-secondary" strokeWidth={2} />
                                  <span className="text-fo-text-secondary">Agent:</span>
                                  <code className="text-xs bg-fo-light px-2 py-1 rounded font-mono">
                                    {play.agent_id}
                                  </code>
                                  <button
                                    onClick={() => copyToClipboard(play.agent_id!, `Agent ID for ${play.code}`)}
                                    className="p-1 hover:bg-fo-light rounded"
                                    title="Copy agent ID"
                                  >
                                    {copiedText === `Agent ID for ${play.code}` ? (
                                      <CheckCircle className="w-4 h-4 text-green-500" strokeWidth={2} />
                                    ) : (
                                      <Copy className="w-4 h-4 text-fo-text-secondary" strokeWidth={2} />
                                    )}
                                  </button>
                                </div>
                              )}
                              
                              {play.hasPromptConfig && (
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-fo-text-secondary" strokeWidth={2} />
                                  <span className="text-fo-text-secondary">
                                    {play.variableCount} variables mapped
                                  </span>
                                </div>
                              )}
                              
                              {play.prompt_template && (
                                <span className="text-xs text-fo-green font-semibold">
                                  ✓ Prompt configured
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => setExpandedPlay(isExpanded ? null : play.code)}
                            className="ml-4 p-2 hover:bg-fo-light rounded-lg transition-colors"
                            title={isExpanded ? 'Collapse' : 'Expand to view prompt'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-fo-text-secondary" strokeWidth={2} />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-fo-text-secondary" strokeWidth={2} />
                            )}
                          </button>
                        </div>
                        
                        {/* Expanded Prompt View */}
                        {isExpanded && play.prompt_template && (
                          <div className="mt-4 pt-4 border-t border-fo-border">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-fo-dark flex items-center gap-2">
                                <FileText className="w-4 h-4" strokeWidth={2} />
                                Prompt Template
                              </h4>
                              <button
                                onClick={() => copyToClipboard(play.prompt_template!, `Prompt for ${play.code}`)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-fo-primary text-white rounded text-sm font-semibold hover:bg-fo-primary/90 transition-colors"
                              >
                                {copiedText === `Prompt for ${play.code}` ? (
                                  <>
                                    <CheckCircle className="w-4 h-4" strokeWidth={2} />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4" strokeWidth={2} />
                                    Copy Prompt
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="bg-fo-bg-light rounded-lg p-4 max-h-96 overflow-y-auto">
                              <pre className="text-xs text-fo-text-secondary whitespace-pre-wrap font-mono">
                                {play.prompt_template}
                              </pre>
                            </div>
                          </div>
                        )}
                        
                        {isExpanded && !play.prompt_template && (
                          <div className="mt-4 pt-4 border-t border-fo-border">
                            <p className="text-sm text-fo-text-secondary italic">
                              No prompt template configured for this play yet.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        ) : !selectedClient ? (
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
                        <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-fo-light">
                      {clientPlays.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-fo-text-secondary">
                            No plays executed yet
                          </td>
                        </tr>
                      ) : (
                        clientPlays.map((play) => {
                          const category = play.claire_plays?.category || 'allbound';
                          const code = play.claire_plays?.code || '';
                          const executionId = play.id;
                          const viewUrl = code && executionId 
                            ? `/client/${category}/${code}/${executionId}?impersonate=${selectedClient}`
                            : null;
                          
                          return (
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
                                  play.status === 'rejected' ? 'bg-gray-200 text-gray-700' :
                                  'bg-fo-light text-fo-text-secondary'
                                }`}>
                                  {play.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-fo-text-secondary">
                                {new Date(play.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4">
                                {viewUrl ? (
                                  <Link
                                    href={viewUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-fo-primary hover:text-fo-primary/80 hover:underline text-sm font-semibold"
                                  >
                                    View Play →
                                  </Link>
                                ) : (
                                  <span className="text-fo-text-secondary text-sm">N/A</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
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
