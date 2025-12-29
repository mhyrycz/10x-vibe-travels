/**
 * React Query Hooks for Create Plan View
 *
 * Custom hooks for fetching user preferences and creating plans
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CreatePlanDto, PlanDto, ErrorDto, PaginatedPlansDto } from "@/types";

/**
 * Fetches plan count to determine if user can create new plan
 */
export function usePlanCount() {
  return useQuery({
    queryKey: ["plans", "count"],
    queryFn: async () => {
      const response = await fetch("/api/plans?limit=1");
      if (!response.ok) {
        throw new Error("Failed to fetch plan count");
      }
      const data = (await response.json()) as PaginatedPlansDto;
      return data.pagination.total;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Mutation hook for creating a new plan
 */
export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePlanDto) => {
      const response = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = (await response.json()) as ErrorDto;
        const errorWithStatus = new Error(error.error.message) as Error & { status: number; code: string };
        errorWithStatus.status = response.status;
        errorWithStatus.code = error.error.code;
        throw errorWithStatus;
      }

      return response.json() as Promise<PlanDto>;
    },
    onSuccess: (newPlan) => {
      // Invalidate plans list to refetch with new plan
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      queryClient.invalidateQueries({ queryKey: ["plans", "count"] });

      // Optionally set new plan in cache for instant loading
      queryClient.setQueryData(["plan", newPlan.id], newPlan);

      // Show success toast
      toast.success("Plan created successfully!", {
        description: "Redirecting to your new travel plan...",
      });
    },
    onError: (error: Error & { status?: number; code?: string }) => {
      // Show error toast with specific message
      toast.error("Failed to create plan", {
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    },
    retry: false, // Don't retry plan creation (expensive AI operation)
    networkMode: "always", // Fail immediately if offline
  });
}
