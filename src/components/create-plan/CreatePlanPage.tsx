/**
 * CreatePlanPage Component
 *
 * Wrapper that provides React Query context to CreatePlanView.
 * This is the client-side entry point for the Create Plan page.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CreatePlanView from "./CreatePlanView";

// Create a client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function CreatePlanPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <CreatePlanView />
    </QueryClientProvider>
  );
}
