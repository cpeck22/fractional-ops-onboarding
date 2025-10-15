'use client';

import { useState } from 'react';
import { createUser } from '@/lib/api';
import toast from 'react-hot-toast';

interface SignupFormProps {
  onSignupSuccess: () => void;
  onSwitchToLogin: () => void;
}

export default function SignupForm({ onSignupSuccess, onSwitchToLogin }: SignupFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    companyName: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const result = await createUser({
        username: formData.username,
        email: formData.email,
        companyName: formData.companyName,
        password: formData.password
      });

      if (result.success) {
        toast.success(result.message);
        onSignupSuccess();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="bg-white py-8 px-6 shadow-fo-shadow rounded-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-fo-primary mb-2">Create Your Account</h2>
        <p className="text-fo-secondary">Get started with your Fractional Ops onboarding</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-fo-secondary">
            Username
          </label>
          <div className="mt-1">
            <input
              id="username"
              name="username"
              type="text"
              required
              value={formData.username}
              onChange={handleChange}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-fo-accent focus:border-fo-accent sm:text-sm"
              placeholder="Choose a username"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-fo-secondary">
            Email Address
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-fo-accent focus:border-fo-accent sm:text-sm"
              placeholder="Enter your email"
            />
          </div>
        </div>

        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-fo-secondary">
            Company Name
          </label>
          <div className="mt-1">
            <input
              id="companyName"
              name="companyName"
              type="text"
              required
              value={formData.companyName}
              onChange={handleChange}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-fo-accent focus:border-fo-accent sm:text-sm"
              placeholder="Enter your company name"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-fo-secondary">
            Password
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-fo-accent focus:border-fo-accent sm:text-sm"
              placeholder="Create a password (min 6 characters)"
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-fo-secondary">
            Confirm Password
          </label>
          <div className="mt-1">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-fo-accent focus:border-fo-accent sm:text-sm"
              placeholder="Confirm your password"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-fo-primary to-fo-accent hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fo-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Account...
              </div>
            ) : (
              'Create Account'
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-fo-secondary">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-fo-accent hover:underline font-medium"
          >
            Sign in here
          </button>
        </p>
      </div>
    </div>
  );
}
