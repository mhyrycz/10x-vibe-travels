/**
 * useMyPlans Hook
 *
 * Custom React Query hook that fetches, transforms, and manages
 * the state of user's travel plans.
 *
 * Responsibilities:
 * - Fetch plans from GET /api/plans endpoint
 * - Transform API response (PaginatedPlansDto) to MyPlansViewModel
 * - Manage loading, error, and success states via React Query
 * - Format dates and prepare data for UI consumption
 */

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { PaginatedPlansDto } from "../../types";
import type { MyPlansViewModel, PlanCardViewModel } from "../my-plans/types";

const PLAN_LIMIT = 10;

/**
 * Fetches plans from the API
 */
async function fetchPlans(): Promise<PaginatedPlansDto> {
  const response = await fetch("/api/plans");

  if (!response.ok) {
    throw new Error("Failed to fetch plans");
  }

  return response.json();
}

/**
 * Transforms API plan data to view model format
 */
function transformPlanToViewModel(plan: PaginatedPlansDto["data"][0]): PlanCardViewModel {
  return {
    id: plan.id,
    name: plan.name,
    destination: plan.destination_text,
    formattedDate: `Created on ${format(new Date(plan.created_at), "MMM d, yyyy")}`,
    href: `/plans/${plan.id}`,
  };
}

/**
 * Main hook - fetches and transforms plans data
 */
export function useMyPlans(): MyPlansViewModel {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["plans"],
    queryFn: fetchPlans,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Transform API response to view model
  const plans: PlanCardViewModel[] = data?.data.map(transformPlanToViewModel) || [];
  const totalPlans = data?.pagination.total || 0;

  return {
    isLoading,
    isError,
    error: error ? (error as Error).message : null,
    plans,
    totalPlans,
    planLimit: PLAN_LIMIT,
  };
}
