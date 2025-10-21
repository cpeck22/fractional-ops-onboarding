'use client';

import { useState, useEffect } from 'react';
import { getAllQuestionnaireData } from '@/lib/supabase';
import ProtectedRoute from '@/components/ProtectedRoute';

interface QuestionnaireResponse {
  id: string;
  user_id: string;
  section: string;
  field_key: string;
  field_value: string;
  created_at: string;
  updated_at: string;
  user_profiles: {
    id: string;
    email: string;
    full_name: string;
    created_at: string;
  };
}

export default function AdminDashboard() {
  const [responses, setResponses] = useState<QuestionnaireResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getAllQuestionnaireData();
      setResponses(data);
    } catch (error) {
      console.error('Failed to load questionnaire data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group responses by user
  const userGroups = responses.reduce((acc, response) => {
    const userId = response.user_id;
    if (!acc[userId]) {
      acc[userId] = {
        user: response.user_profiles,
        responses: []
      };
    }
    acc[userId].responses.push(response);
    return acc;
  }, {} as Record<string, { user: any; responses: QuestionnaireResponse[] }>);

  const formatQuestionnaireData = (responses: QuestionnaireResponse[]) => {
    const data = {
      companyInfo: {},
      basicInfo: {},
      icp: {},
      socialProof: {},
      callToAction: {},
      brand: {}
    };

    responses.forEach(response => {
      if (data[response.section as keyof typeof data]) {
        data[response.section as keyof typeof data][response.field_key] = response.field_value;
      }
    });

    return data;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-fo-primary"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-fo-light to-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-fo-primary mb-2">
              Admin Dashboard - Questionnaire Responses
            </h1>
            <p className="text-fo-text-secondary">
              Internal view of all questionnaire submissions
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* User List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-fo-primary mb-4">
                  Users ({Object.keys(userGroups).length})
                </h2>
                <div className="space-y-3">
                  {Object.entries(userGroups).map(([userId, group]) => (
                    <div
                      key={userId}
                      onClick={() => setSelectedUser(selectedUser === userId ? null : userId)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedUser === userId
                          ? 'border-fo-primary bg-fo-light'
                          : 'border-gray-200 hover:border-fo-primary'
                      }`}
                    >
                      <div className="font-medium text-fo-text">
                        {group.user.full_name || 'No Name'}
                      </div>
                      <div className="text-sm text-fo-text-secondary">
                        {group.user.email}
                      </div>
                      <div className="text-xs text-fo-text-secondary mt-1">
                        {new Date(group.user.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-fo-primary mt-1">
                        {group.responses.length} responses
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Questionnaire Data */}
            <div className="lg:col-span-2">
              {selectedUser ? (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-fo-primary mb-2">
                      Questionnaire Data
                    </h2>
                    <div className="text-sm text-fo-text-secondary">
                      {userGroups[selectedUser].user.email}
                    </div>
                  </div>

                  <div className="space-y-6">
                    {Object.entries(formatQuestionnaireData(userGroups[selectedUser].responses)).map(([section, data]) => (
                      <div key={section} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-fo-primary mb-3 capitalize">
                          {section.replace(/([A-Z])/g, ' $1').trim()}
                        </h3>
                        <div className="space-y-3">
                          {Object.entries(data).map(([key, value]) => (
                            <div key={key}>
                              <div className="text-sm font-medium text-fo-text mb-1">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </div>
                              <div className="text-sm text-fo-text-secondary bg-gray-50 p-2 rounded">
                                {value || 'Not answered'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                  <div className="text-fo-text-secondary">
                    Select a user to view their questionnaire data
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
