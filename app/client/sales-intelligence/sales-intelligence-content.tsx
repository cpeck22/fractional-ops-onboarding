'use client';

import { useSearchParams } from 'next/navigation';
import { BarChart3, Clock } from 'lucide-react';

export default function SalesIntelligencePageContent() {
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-fo-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-fo-primary" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-bold text-fo-dark mb-4">Sales Intelligence</h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-fo-tertiary-4/20 text-fo-tertiary-4 rounded-full text-sm font-semibold">
            <Clock className="w-4 h-4" strokeWidth={2} />
            Coming Soon
          </div>
        </div>
        
        <p className="text-lg font-normal text-fo-text-secondary mb-8 max-w-2xl mx-auto">
          Sales Intelligence will provide actionable insights from your CRM, meeting notes, HubSpot dashboards, and campaign signals to help you understand what&apos;s working and what&apos;s not.
        </p>
        
        <div className="bg-fo-light/50 rounded-lg p-6 text-left max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-fo-dark mb-4">Planned Features</h2>
          <ul className="space-y-3 text-fo-text-secondary font-normal">
            <li className="flex items-start gap-3">
              <span className="text-fo-primary font-semibold">•</span>
              <span>CRM insights and performance metrics</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-fo-primary font-semibold">•</span>
              <span>Meeting notes analysis and trends</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-fo-primary font-semibold">•</span>
              <span>HubSpot dashboard integration</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-fo-primary font-semibold">•</span>
              <span>Campaign signal analysis</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-fo-primary font-semibold">•</span>
              <span>Social listening insights (competitor tracking)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-fo-primary font-semibold">•</span>
              <span>Meeting booking attribution by sequence</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

