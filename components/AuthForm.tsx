'use client';

import { useState, useEffect } from 'react';
import { supabase, signInWithEmail, signUpWithEmail, signOut, getCurrentUser, checkEmailExists } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

interface AuthFormProps {
  onAuthSuccess: () => void;
  showSignup?: boolean;
  onSwitchToLogin?: () => void;
}

export default function AuthForm({ onAuthSuccess, showSignup = true, onSwitchToLogin }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(!showSignup);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  useEffect(() => {
    console.log('🔐 AuthForm: Setting up auth listeners...');
    
    // Check if user is already logged in
    getCurrentUser().then(user => {
      console.log('🔐 AuthForm: Initial auth check result:', user?.email || 'No user');
      console.log('🔐 AuthForm: User object:', user);
      if (user) {
        console.log('🔐 AuthForm: ✅ User found, calling onAuthSuccess');
        setUser(user);
        onAuthSuccess();
      } else {
        console.log('🔐 AuthForm: ❌ No user found on initial check');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 AuthForm: Auth state change event:', event);
        console.log('🔐 AuthForm: Session data:', session);
        console.log('🔐 AuthForm: User from session:', session?.user?.email || 'No user');
        
        if (session?.user) {
          console.log('🔐 AuthForm: ✅ User authenticated, setting user state and calling onAuthSuccess');
          setUser(session.user);
          onAuthSuccess();
        } else {
          console.log('🔐 AuthForm: ❌ No session/user, clearing user state');
          setUser(null);
        }
      }
    );

    return () => {
      console.log('🔐 AuthForm: Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, [onAuthSuccess]);

  // Simple email change handler - no real-time checking to prevent unwanted account creation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    // Reset email exists state when user changes email
    setEmailExists(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signInWithEmail(email, password);
        if (error) throw error;
        toast.success('Welcome back!');
      } else {
        // Validate passwords match for signup
        if (password !== confirmPassword) {
          toast.error('Passwords do not match. Please try again.');
          setLoading(false);
          return;
        }
        
        const { data, error } = await signUpWithEmail(email, password);
        console.log('🔍 Signup attempt result:', { error: error?.message, data: data });
        
        if (error) {
          // Handle specific error cases for duplicate emails
          console.log('🔍 Checking error message:', error.message);
          if (error.message?.includes('already registered') || 
              error.message?.includes('User already registered') ||
              error.message?.includes('already exists') ||
              error.message?.includes('already been registered') ||
              error.message?.includes('duplicate') ||
              error.message?.includes('email address is already')) {
            console.log('🔍 Duplicate email detected via error, showing error message');
            toast.error('Good news! You already have an account. Please sign in instead.');
            setIsLogin(true);
            setEmailExists(true);
            setLoading(false);
            return;
          }
          console.log('🔍 Non-duplicate error, throwing:', error.message);
          throw error;
        }
        
        // Check if signup succeeded but returned null data (duplicate email case)
        if (!data || !data.user) {
          console.log('🔍 Signup succeeded but no user data returned - likely duplicate email');
          toast.error('Good news! You already have an account. Please sign in instead.');
          setIsLogin(true);
          setEmailExists(true);
          setLoading(false);
          return;
        }
        
        console.log('🔍 Signup successful with user data:', data.user);
        console.log('🔍 User created_at:', data.user.created_at);
        console.log('🔍 User confirmation_sent_at:', data.user.confirmation_sent_at);
        
        // Check if this is a genuine new user or duplicate
        // For NEW users: created_at and confirmation_sent_at are the same (or very close)
        // For DUPLICATE emails: Supabase may return existing user
        const createdAt = new Date(data.user.created_at!).getTime();
        const confirmationSentAt = new Date(data.user.confirmation_sent_at!).getTime();
        const timeDiff = Math.abs(createdAt - confirmationSentAt);
        
        console.log('🔍 Time difference between created_at and confirmation_sent_at:', timeDiff, 'ms');
        
        // If the times are more than 10 seconds apart, this is likely a duplicate
        // (Supabase reuses the old user record and updates confirmation_sent_at)
        if (timeDiff > 10000) {
          console.log('🔍 Large time gap detected - likely duplicate email');
          toast.error('Good news! You already have an account. Please sign in instead.');
          setIsLogin(true);
          setEmailExists(true);
          setLoading(false);
          return;
        }
        
        console.log('🔍 Genuine new user signup - showing email confirmation');
        toast.success('Account created! Please check your email to verify your account.');
        setShowEmailConfirmation(true);
      }
    } catch (error: any) {
      console.log('🔍 Catch block error:', error.message);
      // Handle specific error cases
      if (error.message?.includes('already registered') || 
          error.message?.includes('User already registered') ||
          error.message?.includes('already exists') ||
          error.message?.includes('already been registered') ||
          error.message?.includes('duplicate') ||
          error.message?.includes('email address is already')) {
        console.log('🔍 Catch block: Duplicate email detected');
        toast.error('Good news! You already have an account. Please sign in instead.');
        setIsLogin(true);
        setEmailExists(true);
      } else {
        console.log('🔍 Catch block: Other error:', error.message);
        toast.error(error.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailConfirmed = () => {
    setShowEmailConfirmation(false);
    setIsLogin(true);
    // Navigate to sign-in page
    window.location.href = '/signin';
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error: any) {
      toast.error('Failed to sign out');
    }
  };

  if (user) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-fo-primary rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm text-gray-700">
            {user.email}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  // Email confirmation step
  if (showEmailConfirmation) {
    return (
      <div className="text-center space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Check Your Email
          </h3>
          <p className="text-gray-600 mb-4">
            We&apos;ve sent a confirmation link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Please check your inbox and click the confirmation link to verify your account.
          </p>
          <div className="text-sm text-gray-500 mb-6">
            <p className="font-bold">
              The email will come from &quot;Supabase&quot;
            </p>
            <p className="italic">
              (check your junk folder just in case)
            </p>
          </div>
          <button
            onClick={handleEmailConfirmed}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-semibold transition-colors"
          >
            I have successfully confirmed my email
          </button>
        </div>
        <button
          onClick={() => setShowEmailConfirmation(false)}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Back to sign up
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email"
          />
          {emailExists && !isLogin && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 font-medium">
                Good News, you already have an account!
              </p>
              <p className="text-sm text-green-600 mt-1">
                Please sign in below with your password.
              </p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your password"
          />
        </div>

        {!isLogin && (
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required={!isLogin}
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm your password"
            />
            {password && confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-sm text-red-600">
                Passwords do not match
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (!isLogin && password !== confirmPassword)}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Please wait...' : (isLogin ? 'Sign In' : (emailExists ? 'Sign In Instead' : 'Start Now'))}
        </button>
      </form>

      <div className="text-center">
        <button
          onClick={() => {
            if (isLogin) {
              // Switch to signup
              setIsLogin(false);
            } else {
              // Navigate to sign-in page
              window.location.href = '/signin';
            }
          }}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          {isLogin ? "Don&apos;t have an account? Sign up" : "Already have an account? Sign In"}
        </button>
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-400">
          By continuing, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </div>
  );
}
