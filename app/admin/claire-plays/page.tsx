'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Play {
  id?: string;
  code: string;
  name: string;
  category: string;
  description?: string;
  agent_name_pattern?: string;
  is_active: boolean;
  documentation_status?: string;
  content_agent_status?: string;
}

export default function ClairePlaysAdminPage() {
  const [plays, setPlays] = useState<Play[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlay, setEditingPlay] = useState<Play | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadPlays();
  }, []);

  const loadPlays = async () => {
    try {
      const { data, error } = await supabase
        .from('claire_plays')
        .select('*')
        .order('code', { ascending: true });

      if (error) {
        console.error('Error loading plays:', error);
        toast.error('Failed to load plays');
        return;
      }

      setPlays(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading plays:', error);
      toast.error('Failed to load plays');
      setLoading(false);
    }
  };

  const handleSave = async (play: Play) => {
    try {
      if (play.id) {
        // Update existing
        const { error } = await supabase
          .from('claire_plays')
          .update(play)
          .eq('id', play.id);

        if (error) throw error;
        toast.success('Play updated successfully');
      } else {
        // Create new
        const { error } = await supabase
          .from('claire_plays')
          .insert(play);

        if (error) throw error;
        toast.success('Play created successfully');
      }

      setShowForm(false);
      setEditingPlay(null);
      loadPlays();
    } catch (error: any) {
      console.error('Error saving play:', error);
      toast.error(error.message || 'Failed to save play');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fo-primary mx-auto mb-4"></div>
          <p className="text-fo-text-secondary">Loading plays...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-fo-light to-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-fo-dark mb-2">Claire Plays Management</h1>
          <p className="text-fo-text-secondary">Manage the catalog of available plays</p>
        </div>

        <div className="mb-6">
          <button
            onClick={() => {
              setEditingPlay(null);
              setShowForm(true);
            }}
            className="px-6 py-2 bg-fo-primary text-white rounded-lg font-semibold hover:bg-opacity-90 transition-all"
          >
            + Add New Play
          </button>
        </div>

        {showForm && (
          <PlayForm
            play={editingPlay}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingPlay(null);
            }}
          />
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-fo-light">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-fo-dark uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fo-light">
              {plays.map((play) => (
                <tr key={play.id || play.code} className="hover:bg-fo-light/50">
                  <td className="px-6 py-4 text-sm font-mono font-bold text-fo-primary">{play.code}</td>
                  <td className="px-6 py-4 text-sm text-fo-dark">{play.name}</td>
                  <td className="px-6 py-4 text-sm text-fo-text-secondary capitalize">{play.category}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      play.is_active ? 'bg-fo-green/20 text-fo-green' : 'bg-fo-light text-fo-text-secondary'
                    }`}>
                      {play.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        setEditingPlay(play);
                        setShowForm(true);
                      }}
                      className="text-fo-primary hover:underline text-sm"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PlayForm({ play, onSave, onCancel }: { play: Play | null; onSave: (play: Play) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState<Play>(play || {
    code: '',
    name: '',
    category: 'allbound',
    is_active: true,
    agent_name_pattern: ''
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-8 mb-6">
      <h2 className="text-xl font-bold text-fo-dark mb-6">
        {play ? 'Edit Play' : 'Create New Play'}
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-fo-dark mb-2">Code *</label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            className="w-full px-4 py-2 border border-fo-light rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
            placeholder="e.g., 0001, 2001"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-fo-dark mb-2">Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-fo-light rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
            placeholder="Play name"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-fo-dark mb-2">Category *</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
            className="w-full px-4 py-2 border border-fo-light rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
          >
            <option value="allbound">Allbound</option>
            <option value="outbound">Outbound</option>
            <option value="nurture">Nurture</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-fo-dark mb-2">Agent Name Pattern</label>
          <input
            type="text"
            value={formData.agent_name_pattern || ''}
            onChange={(e) => setFormData({ ...formData, agent_name_pattern: e.target.value })}
            className="w-full px-4 py-2 border border-fo-light rounded-lg focus:outline-none focus:ring-2 focus:ring-fo-primary"
            placeholder="e.g., 0001 (usually same as code)"
          />
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm font-semibold text-fo-dark">Active</span>
          </label>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => onSave(formData)}
            className="px-6 py-2 bg-fo-primary text-white rounded-lg font-semibold hover:bg-opacity-90 transition-all"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-fo-light text-fo-dark rounded-lg hover:bg-fo-light transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

