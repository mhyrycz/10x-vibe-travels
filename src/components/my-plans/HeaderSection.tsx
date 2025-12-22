/**
 * HeaderSection Component
 *
 * Displays page title, plan count, and create plan button.
 * Positioned at the top of the My Plans page.
 */

import { CreatePlanButton } from "./CreatePlanButton";

interface HeaderSectionProps {
  planCount: number;
  planLimit: number;
}

export function HeaderSection({ planCount, planLimit }: HeaderSectionProps) {
  const isLimitReached = planCount >= planLimit;

  return (
    <header className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Travel Plans</h1>
        <p className="mt-1 text-sm text-gray-600">
          {planCount} of {planLimit} plans created
        </p>
      </div>

      <CreatePlanButton isDisabled={isLimitReached} planLimit={planLimit} />
    </header>
  );
}
