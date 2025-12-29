/**
 * Custom hook for fetching user preferences
 * Implements GET /api/users/me/preferences with React Query
 */

import { useQuery } from "@tanstack/react-query";
import type { UserPreferencesDto, ErrorDto } from "../../../types";

/**
 * Hook to fetch current user preferences from the API
 *
 * @returns React Query result with preferences data, loading state, and error handling
 *
 * Features:
 * - Automatic caching with 5-minute stale time
 * - Single retry on failure
 * - Error enrichment with status code and error code
 * - Type-safe response handling
 */
export function useUserPreferences() {
  return useQuery({
    queryKey: ["user", "preferences"],
    queryFn: async () => {
      const response = await fetch("/api/users/me/preferences");

      if (!response.ok) {
        const error = (await response.json()) as ErrorDto;
        const errorWithStatus = new Error(error.error.message) as Error & {
          status: number;
          code: string;
        };
        errorWithStatus.status = response.status;
        errorWithStatus.code = error.error.code;
        throw errorWithStatus;
      }

      return response.json() as Promise<UserPreferencesDto>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 1,
  });
}
