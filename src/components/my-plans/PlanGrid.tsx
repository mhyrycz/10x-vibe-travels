/**
 * PlanGrid Component
 *
 * Displays user's travel plans in a responsive grid layout.
 * Each plan is rendered as a PlanCard component.
 */

import { PlanCard } from "./PlanCard";
import type { PlanCardViewModel } from "./types";

interface PlanGridProps {
  plans: PlanCardViewModel[];
}

export function PlanGrid({ plans }: PlanGridProps) {
  return (
    <div className="mt-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}
