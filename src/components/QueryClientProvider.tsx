/**
 * Global QueryClient Provider
 *
 * Singleton QueryClient instance shared across all Astro islands.
 * This ensures proper cache sharing between all components and pages.
 *
 * Configuration:
 * - refetchOnWindowFocus: false - Don't refetch on window focus
 * - retry: 1 - Retry failed requests once
 * - staleTime/gcTime configured per-query as needed
 */

import { QueryClient, QueryClientProvider as TanStackQueryClientProvider } from "@tanstack/react-query";
// import { CacheDebugger } from "./CacheDebugger";

// Create a single QueryClient instance that will be shared across all components
// This is created outside the component so it's a true singleton
let queryClientSingleton: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always create a new QueryClient
    return new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
  }

  // Client: create the QueryClient once and reuse it
  if (!queryClientSingleton) {
    queryClientSingleton = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
  }
  return queryClientSingleton;
}

interface QueryClientProviderProps {
  children: React.ReactNode;
}

export function QueryClientProvider({ children }: QueryClientProviderProps) {
  const queryClient = getQueryClient();

  return (
    <TanStackQueryClientProvider client={queryClient}>
      {children}
      {/* <CacheDebugger /> */}
    </TanStackQueryClientProvider>
  );
}
