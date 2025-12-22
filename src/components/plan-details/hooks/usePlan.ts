/**
 * usePlan Hook
 *
 * React Query hook for fetching and transforming plan details from the API.
 * Handles data fetching, caching, error states, and ViewModel transformation.
 */

import { useQuery } from "@tanstack/react-query";
import type { PlanDto } from "../../../types";
import type { PlanDetailsViewModel } from "../types";
import { transformPlanToViewModel } from "../utils";

/**
 * Fetches plan details from the API
 * @param planId - UUID of the plan to fetch
 * @returns Promise resolving to PlanDto
 */
async function fetchPlan(planId: string): Promise<PlanDto> {
  const response = await fetch(`/api/plans/${planId}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || `Failed to fetch plan (${response.status})`;
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Custom hook for fetching and managing plan details
 * @param planId - UUID of the plan to fetch
 * @returns Query result with transformed ViewModel data
 */
export function usePlan(planId: string) {
  return useQuery({
    queryKey: ["plan", planId],
    queryFn: () => fetchPlan(planId),
    select: (data: PlanDto): PlanDetailsViewModel => transformPlanToViewModel(data),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1, // Only retry once (ownership/not found errors shouldn't retry)
  });
}
