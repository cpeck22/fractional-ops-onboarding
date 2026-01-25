'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';

// Admin emails that can access this page
const ADMIN_EMAILS = [
  'ali.hassan@fractionalops.com',
  'sharifali1000@gmail.com',
  'corey@fractionalops.com',
];

export default function RegenerateWorkspacePage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  
  // Form state
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const checkAdminAccess = useCallback(async () => {
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
  }, [router]);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setResult({ success: false, message: 'Please enter a client email' });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      // Call regenerate workspace API with email
      // The API will handle looking up the userId from email
      const response = await fetch('/api/admin/regenerate-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await response.json();

      if (data.success) {
        setResult({ 
          success: true, 
          message: `✅ Workspace re-generated!`
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
      <div className="min-h-screen bg-fo-bg-light flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-fo-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-fo-bg-light flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-3xl font-bold text-fo-dark mb-4">Access Denied</h1>
          <p className="text-fo-text-secondary mb-2">You don&apos;t have permission to access this page.</p>
          <p className="text-fo-text-secondary text-sm mb-6">Logged in as: {currentUser}</p>
          <button
            onClick={() => router.push('/questionnaire')}
            className="px-6 py-3 bg-fo-primary text-white rounded-lg hover:bg-fo-primary/90 font-semibold"
          >
            Go to Questionnaire
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fo-bg-light">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-fo-sidebar-dark to-gray-900 text-white py-4 px-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <span>←</span>
              <span>Back to Admin</span>
            </button>
            <div className="h-6 w-px bg-gray-600"></div>
            <span className="px-3 py-1 bg-fo-primary text-white rounded-full text-xs font-semibold">
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
        <div className="bg-white rounded-xl shadow-lg p-8 border border-fo-border">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-fo-primary/10 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-fo-primary" strokeWidth={2} />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-fo-dark mb-2">Regenerate Workspace</h1>
            <p className="text-fo-text-secondary">
              Regenerate a client&apos;s workspace using their existing questionnaire answers
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-fo-dark mb-2">
                Client Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setResult(null); // Clear result when typing
                }}
                placeholder="client@company.com"
                className="w-full px-4 py-3 border border-fo-border rounded-lg focus:ring-2 focus:ring-fo-primary focus:border-fo-primary text-fo-dark bg-white"
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-fo-text-secondary mt-1">
                Enter the email address the client used to sign up
              </p>
            </div>

            {/* Warning Box */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800 font-medium mb-2">
                ⚠️ Important: Before regenerating, make sure you&apos;ve deleted the workspace in Octave first!
              </p>
              <p className="text-xs text-orange-700">
                Go to Octave → Delete the client&apos;s workspace manually, then come back here to regenerate it.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-fo-primary text-white hover:bg-fo-primary/90 shadow-lg hover:shadow-xl'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Regenerating Workspace...
                </span>
              ) : (
                'Regenerate Workspace'
              )}
            </button>
          </form>

          {/* Result Message */}
          {result && (
            <div className={`mt-6 p-4 rounded-lg ${
              result.success 
                ? 'bg-fo-tertiary-3/20 border border-fo-tertiary-3' 
                : 'bg-fo-tertiary-4/20 border border-fo-tertiary-4'
            }`}>
              <p className={`text-sm font-medium ${result.success ? 'text-fo-tertiary-3' : 'text-fo-tertiary-4'}`}>
                {result.message}
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-8 bg-fo-primary/10 border border-fo-primary/20 rounded-lg p-4">
            <h3 className="font-semibold text-fo-dark mb-2 flex items-center gap-2">
              <span className="text-fo-primary">ℹ️</span>
              How it works
            </h3>
            <ul className="text-sm text-fo-text-secondary space-y-1">
              <li>1. Delete the client&apos;s workspace in Octave manually</li>
              <li>2. Enter the client&apos;s email address here</li>
              <li>3. The system will use their existing questionnaire answers to regenerate the workspace</li>
              <li>4. Same error handling and success popup as normal workspace creation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
