/**
 * LoadingState Component
 *
 * Displays skeleton placeholders while plans are being fetched.
 * Provides visual feedback during async data loading.
 */

import { Skeleton } from "../ui/skeleton";

export function LoadingState() {
  return (
    <div className="mt-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Render 6 skeleton cards */}
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            {/* Plan name skeleton */}
            <Skeleton className="mb-3 h-6 w-3/4" />

            {/* Destination skeleton */}
            <Skeleton className="mb-2 h-4 w-1/2" />

            {/* Date skeleton */}
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
