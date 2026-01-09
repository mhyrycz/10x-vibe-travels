/**
 * MyPlansView Component
 *
 * Main interactive component for the My Plans page.
 * Orchestrates fetching user plans, managing view state, and rendering
 * appropriate child components based on loading/error/success states.
 */

import { useMyPlans } from "./hooks/useMyPlans";
import { HeaderSection } from "./HeaderSection";
import { PlanGrid } from "./PlanGrid";
import { LoadingState } from "./LoadingState";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";

const PLAN_LIMIT = 10;

export function MyPlansView() {
  const { isError, isLoading, plans, totalPlans, error } = useMyPlans();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with title and create button - always visible unless error */}
      {!isError && <HeaderSection planCount={totalPlans} planLimit={PLAN_LIMIT} />}

      {/* Loading State */}
      {isLoading && <LoadingState />}

      {/* Error State */}
      {isError && <ErrorState errorMessage={error || "An unexpected error occurred"} />}

      {/* Empty State - no plans */}
      {!isLoading && !isError && plans.length === 0 && <EmptyState planLimit={PLAN_LIMIT} />}

      {/* Success State - display plans grid */}
      {!isLoading && !isError && plans.length > 0 && <PlanGrid plans={plans} />}
    </div>
  );
}
