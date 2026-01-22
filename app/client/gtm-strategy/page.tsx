import { Suspense } from 'react';
import GTMStrategyPageContent from './gtm-strategy-content';

export const dynamic = 'force-dynamic';

export default function GTMStrategyPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fo-primary mx-auto mb-4"></div>
          <p className="text-fo-text-secondary">Loading GTM Strategy...</p>
        </div>
      </div>
    }>
      <GTMStrategyPageContent />
    </Suspense>
  );
}
