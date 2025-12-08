import { Suspense } from 'react';
import HomeContent from '@/components/HomeContent';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Home() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      <div className="container mx-auto">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          <HomeContent />
        </Suspense>
      </div>
    </div>
  );
}
