/**
 * EmptyState Component
 *
 * Displayed when user has no travel plans yet.
 * Encourages user to create their first plan with a call-to-action.
 */

import { Button } from "../ui/button";
import { PlusCircle } from "lucide-react";

interface EmptyStateProps {
  planLimit: number;
}

export function EmptyState({ planLimit }: EmptyStateProps) {
  return (
    <div className="mt-16 flex flex-col items-center justify-center text-center">
      {/* Icon */}
      <div className="mb-6 rounded-full bg-gray-100 p-6">
        <PlusCircle className="h-16 w-16 text-gray-400" />
      </div>

      {/* Title */}
      <h2 className="mb-2 text-2xl font-semibold text-gray-900">No plans yet</h2>

      {/* Description */}
      <p className="mb-8 max-w-md text-gray-600">
        Start planning your next adventure! Create your first travel plan and let AI help you discover amazing
        activities and experiences.
      </p>

      {/* CTA Button */}
      <Button asChild size="lg">
        <a href="/plans/new">
          <PlusCircle className="mr-2 h-5 w-5" />
          Create Your First Plan
        </a>
      </Button>

      {/* Limit info */}
      <p className="mt-6 text-sm text-gray-500">You can create up to {planLimit} plans</p>
    </div>
  );
}
