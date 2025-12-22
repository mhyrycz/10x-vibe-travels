/**
 * PlanDetailsPage Component
 *
 * Wrapper component that provides React Query context for the Plan Details view.
 * This is the client-side entry point mounted by Astro.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlanDetailsView } from "./plan-details/PlanDetailsView";

// Create a client instance with default configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface PlanDetailsPageProps {
  planId: string;
}

export function PlanDetailsPage({ planId }: PlanDetailsPageProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <PlanDetailsView planId={planId} />
    </QueryClientProvider>
  );
}
