'use client';

import { useSearchParams } from 'next/navigation';
import { FileText, Clock } from 'lucide-react';

export default function SalesPlanPage() {
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get('impersonate');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-fo-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-fo-primary" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-bold text-fo-dark mb-4">Sales Plan</h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-fo-tertiary-4/20 text-fo-tertiary-4 rounded-full text-sm font-semibold">
            <Clock className="w-4 h-4" strokeWidth={2} />
            Coming Soon
          </div>
        </div>
        
        <p className="text-lg font-normal text-fo-text-secondary mb-8 max-w-2xl mx-auto">
          The Sales Plan will be a financial KPI business plan that helps you track and manage your sales performance metrics.
        </p>
        
        <div className="bg-fo-light/50 rounded-lg p-6 text-left max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-fo-dark mb-4">What to Expect</h2>
          <ul className="space-y-3 text-fo-text-secondary font-normal">
            <li className="flex items-start gap-3">
              <span className="text-fo-primary font-semibold">•</span>
              <span>Financial KPIs and business metrics tracking</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-fo-primary font-semibold">•</span>
              <span>Sales performance dashboards</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-fo-primary font-semibold">•</span>
              <span>Revenue forecasting and planning tools</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

