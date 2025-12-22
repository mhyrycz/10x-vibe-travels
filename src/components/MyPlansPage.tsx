/**
 * MyPlansPage Component
 *
 * Wrapper that provides React Query context to MyPlansView.
 * This is the client-side entry point for the My Plans page.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MyPlansView } from "./MyPlansView";

// Create a client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function MyPlansPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <MyPlansView />
    </QueryClientProvider>
  );
}
