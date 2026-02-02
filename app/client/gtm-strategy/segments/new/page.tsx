import { Suspense } from 'react';
import Content from './content';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function NewPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-fo-primary animate-spin" strokeWidth={2} />
      </div>
    }>
      <Content />
    </Suspense>
  );
}
