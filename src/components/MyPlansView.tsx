/**
 * MyPlansView Component
 *
 * Main interactive component for the My Plans page.
 * Orchestrates fetching user plans, managing view state, and rendering
 * appropriate child components based on loading/error/success states.
 */

import { useMyPlans } from "./hooks/useMyPlans";
import { HeaderSection } from "./my-plans/HeaderSection";
import { PlanGrid } from "./my-plans/PlanGrid";
import { LoadingState } from "./my-plans/LoadingState";
import { EmptyState } from "./my-plans/EmptyState";
import { ErrorState } from "./my-plans/ErrorState";

const PLAN_LIMIT = 10;

export function MyPlansView() {
  const viewModel = useMyPlans();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with title and create button - always visible unless error */}
      {!viewModel.isError && <HeaderSection planCount={viewModel.totalPlans} planLimit={PLAN_LIMIT} />}

      {/* Loading State */}
      {viewModel.isLoading && <LoadingState />}

      {/* Error State */}
      {viewModel.isError && <ErrorState errorMessage={viewModel.error || "An unexpected error occurred"} />}

      {/* Empty State - no plans */}
      {!viewModel.isLoading && !viewModel.isError && viewModel.plans.length === 0 && (
        <EmptyState planLimit={PLAN_LIMIT} />
      )}

      {/* Success State - display plans grid */}
      {!viewModel.isLoading && !viewModel.isError && viewModel.plans.length > 0 && <PlanGrid plans={viewModel.plans} />}
    </div>
  );
}
