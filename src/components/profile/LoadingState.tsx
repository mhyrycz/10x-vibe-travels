/**
 * Loading skeleton state for Edit Preferences view
 * Displays while fetching user preferences from API
 * Matches form structure to prevent layout shift
 */

import { Skeleton } from "../../components/ui/skeleton";

export default function LoadingState() {
  return (
    <div className="bg-card border rounded-lg p-4 sm:p-6 shadow-sm">
      {/* Form fields skeleton */}
      <div className="space-y-6">
        {/* People Count Field */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10" />
        </div>

        {/* Trip Type Field */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </div>

        {/* Age Field */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10" />
        </div>

        {/* Country Field */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10" />
        </div>

        {/* Comfort Field */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </div>

        {/* Budget Field */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <Skeleton className="h-10 sm:w-32" />
          <Skeleton className="h-10 sm:w-32" />
        </div>
      </div>
    </div>
  );
}
