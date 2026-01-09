/**
 * PlanDetailsPage Component
 *
 * Main view for the Plan Details page with QueryClient provider.
 * This is an Astro island that needs its own React Query context.
 */

import { QueryClientProvider } from "../QueryClientProvider";
import { PlanDetailsView } from "./PlanDetailsView";

interface PlanDetailsPageProps {
  planId: string;
}

export function PlanDetailsPage({ planId }: PlanDetailsPageProps) {
  return (
    <QueryClientProvider>
      <PlanDetailsView planId={planId} />
    </QueryClientProvider>
  );
}
