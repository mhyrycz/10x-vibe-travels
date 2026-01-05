/**
 * LoadingState Component
 *
 * Displays skeleton placeholders while plan data is being fetched.
 * Provides visual feedback during async data loading.
 */

import { Skeleton } from "../ui/skeleton";

export function LoadingState() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-6">
        <Skeleton className="mb-2 h-10 w-3/4" />
        <Skeleton className="mb-1 h-5 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>

      {/* Metadata card skeleton */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>

      {/* Day cards skeletons */}
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, dayIndex) => (
          <div key={dayIndex} className="rounded-lg border border-gray-200 bg-white p-6">
            <Skeleton className="mb-4 h-7 w-64" />

            {/* Activity skeletons */}
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, activityIndex) => (
                <div key={activityIndex} className="rounded border border-gray-100 bg-gray-50 p-3">
                  <Skeleton className="mb-2 h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
