'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Admin emails that can access this page
const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

export default function RerunAgentPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  
  // Form state
  const [email, setEmail] = useState('');
  const [agentType, setAgentType] = useState('callPrep');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

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
        adminEmail => adminEmail.toLowerCase() === user.email?.toLowerCase()
      );

      setIsAdmin(isAdminUser);
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setResult({ success: false, message: 'Please enter a client email' });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/rerun-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), agentType })
      });

      const data = await response.json();

      if (data.success) {
        setResult({ 
          success: true, 
          message: `✅ ${agentType === 'callPrep' ? 'Call Prep' : agentType} agent rerun successfully for ${email}! The client's /results page now shows the new output.`
        });
        setEmail(''); // Clear form on success
      } else {
        setResult({ 
          success: false, 
          message: `❌ Error: ${data.error}${data.details ? ` - ${data.details}` : ''}`
        });
      }
    } catch (error: any) {
      setResult({ 
        success: false, 
        message: `❌ Request failed: ${error.message}`
      });
    } finally {
      setIsSubmitting(false);
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
          <p className="text-gray-600 mb-2">You don&apos;t have permission to access this page.</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-4 px-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/strategies')}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <span>←</span>
              <span>Back to Strategies</span>
            </button>
            <div className="h-6 w-px bg-gray-600"></div>
            <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-bold">
              ADMIN TOOL
            </span>
          </div>
          <span className="text-gray-300 text-sm">
            Logged in as: <span className="text-white font-medium">{currentUser}</span>
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔄</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Rerun Agent</h1>
            <p className="text-gray-600">
              Regenerate a specific agent output for a client&apos;s strategy
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Client Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@company.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-fo-primary text-gray-900"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the email address the client used to sign up
              </p>
            </div>

            {/* Agent Type Dropdown */}
            <div>
              <label htmlFor="agentType" className="block text-sm font-semibold text-gray-700 mb-2">
                Agent to Rerun
              </label>
              <select
                id="agentType"
                value={agentType}
                onChange={(e) => setAgentType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-fo-primary text-gray-900 bg-white"
                disabled={isSubmitting}
              >
                <option value="callPrep">📞 Call Prep (Call Script + Objection Handling)</option>
                {/* Add more options here in the future */}
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-fo-primary text-white hover:bg-fo-primary/90 shadow-lg hover:shadow-xl'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Running Agent...
                </span>
              ) : (
                'Rerun Agent'
              )}
            </button>
          </form>

          {/* Result Message */}
          {result && (
            <div className={`mt-6 p-4 rounded-lg ${
              result.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.message}
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">ℹ️ How it works</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>1. Enter the client&apos;s email address</li>
              <li>2. Select which agent to rerun</li>
              <li>3. The system will regenerate that specific output</li>
              <li>4. The client&apos;s /results page will immediately show the new content</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

