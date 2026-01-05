import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  UpdatePlanDto,
  UpdateActivityDto,
  MoveActivityDto,
  RegeneratePlanDto,
  PlanDto,
  CreateActivityDto,
} from "@/types";

/**
 * Hook for updating plan metadata (name, budget, note_text, people_count)
 * PATCH /api/plans/{planId}
 */
export function useUpdatePlan(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    networkMode: "always",
    retry: 1,
    mutationFn: async (data: UpdatePlanDto) => {
      const response = await fetch(`/api/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to update plan");
      }

      return response.json();
    },
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["plan", planId] });

      // Snapshot previous value
      const previousPlan = queryClient.getQueryData<PlanDto>(["plan", planId]);

      // Optimistically update plan metadata
      if (previousPlan) {
        queryClient.setQueryData<PlanDto>(["plan", planId], {
          ...previousPlan,
          ...data,
        });
      }

      return { previousPlan };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousPlan) {
        queryClient.setQueryData(["plan", planId], context.previousPlan);
      }
      toast.error("Failed to update plan", {
        description: error.message,
      });
    },
    onSuccess: () => {
      // Invalidate and refetch to get server truth
      queryClient.invalidateQueries({ queryKey: ["plan", planId] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plan updated successfully");
    },
  });
}

/**
 * Hook for updating activity details (title, duration_minutes, transport_minutes)
 * PATCH /api/plans/{planId}/activities/{activityId}
 */
export function useUpdateActivity(planId: string, activityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    networkMode: "always",
    retry: 1,
    mutationFn: async (data: UpdateActivityDto) => {
      const response = await fetch(`/api/plans/${planId}/activities/${activityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to update activity");
      }

      return response.json();
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["plan", planId] });

      const previousPlan = queryClient.getQueryData<PlanDto>(["plan", planId]);

      // Optimistically update activity in nested structure
      if (previousPlan) {
        const updatedPlan = {
          ...previousPlan,
          days: previousPlan.days.map((day) => ({
            ...day,
            activities: day.activities.map((activity) =>
              activity.id === activityId ? { ...activity, ...data } : activity
            ),
          })),
        };
        queryClient.setQueryData<PlanDto>(["plan", planId], updatedPlan);
      }

      return { previousPlan };
    },
    onError: (error, _variables, context) => {
      if (context?.previousPlan) {
        queryClient.setQueryData(["plan", planId], context.previousPlan);
      }
      toast.error("Failed to update activity", {
        description: error.message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", planId] });
      toast.success("Activity updated successfully");
    },
  });
}

/**
 * Hook for moving activity to different day/position
 * POST /api/plans/{planId}/activities/{activityId}/move
 */
export function useMoveActivity(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    networkMode: "always",
    retry: 1,
    mutationFn: async ({ activityId, data }: { activityId: string; data: MoveActivityDto }) => {
      const response = await fetch(`/api/plans/${planId}/activities/${activityId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to move activity");
      }

      return response.json();
    },
    onMutate: async ({ activityId, data }) => {
      await queryClient.cancelQueries({ queryKey: ["plan", planId] });

      const previousPlan = queryClient.getQueryData<PlanDto>(["plan", planId]);

      // Optimistically update activity position
      if (previousPlan) {
        type ActivityType = PlanDto["days"][0]["activities"][0];
        let activityToMove: ActivityType | null = null;
        let sourceDayIndex = -1;
        let sourceActivityIndex = -1;

        // Find the activity to move
        previousPlan.days.forEach((day, dIdx) => {
          day.activities.forEach((activity, aIdx) => {
            if (activity.id === activityId) {
              activityToMove = activity;
              sourceDayIndex = dIdx;
              sourceActivityIndex = aIdx;
            }
          });
        });

        if (activityToMove) {
          // Remove from source
          const updatedPlan = JSON.parse(JSON.stringify(previousPlan)) as PlanDto;
          updatedPlan.days[sourceDayIndex].activities.splice(sourceActivityIndex, 1);

          // Add to target day
          type DayType = PlanDto["days"][0];
          const targetDay = updatedPlan.days.find((day: DayType) => day.id === data.target_day_id);
          if (targetDay) {
            const activity = activityToMove as ActivityType;
            // Insert at specified order_index (convert to 0-based array index)
            targetDay.activities.splice(data.target_order_index - 1, 0, activity);
          }

          queryClient.setQueryData<PlanDto>(["plan", planId], updatedPlan);
        }
      }

      return { previousPlan };
    },
    onError: (error, _variables, context) => {
      if (context?.previousPlan) {
        queryClient.setQueryData(["plan", planId], context.previousPlan);
      }
      toast.error("Failed to move activity", {
        description: error.message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", planId] });
    },
  });
}

/**
 * Hook for regenerating plan itinerary with updated parameters
 * POST /api/plans/{planId}/regenerate
 *
 * This is a destructive operation that replaces all days and activities
 * No optimistic update as the entire structure changes
 */
export function useRegeneratePlan(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    networkMode: "always",
    retry: 1,
    mutationFn: async (data: RegeneratePlanDto) => {
      const response = await fetch(`/api/plans/${planId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to regenerate plan");
      }

      return response.json();
    },
    onMutate: async () => {
      toast.loading("Regenerating plan...", { id: `regenerate-${planId}` });
    },
    onError: (error) => {
      toast.error("Failed to regenerate plan", {
        id: `regenerate-${planId}`,
        description: error.message,
      });
    },
    onSuccess: () => {
      // Invalidate to trigger refetch with new plan structure
      queryClient.invalidateQueries({ queryKey: ["plan", planId] });
      toast.success("Plan regenerated successfully", {
        id: `regenerate-${planId}`,
      });
    },
  });
}

/**
 * Hook for deleting a plan
 * DELETE /api/plans/{planId}
 */
export function useDeletePlan(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    networkMode: "always",
    retry: 1,
    mutationFn: async () => {
      const response = await fetch(`/api/plans/${planId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to delete plan");
      }

      // DELETE returns 204 No Content, no JSON to parse
      return null;
    },
    onError: (error) => {
      toast.error("Failed to delete plan", {
        description: error.message,
      });
    },
    onSuccess: () => {
      // Remove plan from cache
      queryClient.removeQueries({ queryKey: ["plan", planId] });
      // Invalidate plans list
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plan deleted successfully");
    },
  });
}

/**
 * Hook for creating a custom activity
 * POST /api/plans/{planId}/days/{dayId}/activities
 */
export function useCreateActivity(planId: string, dayId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    networkMode: "always",
    retry: 1,
    mutationFn: async (data: CreateActivityDto) => {
      const response = await fetch(`/api/plans/${planId}/days/${dayId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to create activity");
      }

      return response.json();
    },
    onError: (error) => {
      toast.error("Failed to create activity", {
        description: error.message,
      });
    },
    onSuccess: () => {
      // Invalidate and refetch to get updated plan with new activity
      queryClient.invalidateQueries({ queryKey: ["plan", planId] });
      toast.success("Activity created successfully");
    },
  });
}

/**
 * Hook for deleting an activity
 * DELETE /api/plans/{planId}/activities/{activityId}
 */
export function useDeleteActivity(planId: string, activityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    networkMode: "always",
    retry: 1,
    mutationFn: async () => {
      const response = await fetch(`/api/plans/${planId}/activities/${activityId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to delete activity");
      }

      // DELETE returns 204 No Content, no JSON to parse
      return null;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["plan", planId] });

      const previousPlan = queryClient.getQueryData<PlanDto>(["plan", planId]);

      // Optimistically remove activity from nested structure
      if (previousPlan) {
        const updatedPlan = {
          ...previousPlan,
          days: previousPlan.days.map((day) => ({
            ...day,
            activities: day.activities.filter((activity) => activity.id !== activityId),
          })),
        };
        queryClient.setQueryData<PlanDto>(["plan", planId], updatedPlan);
      }

      return { previousPlan };
    },
    onError: (error, _variables, context) => {
      if (context?.previousPlan) {
        queryClient.setQueryData(["plan", planId], context.previousPlan);
      }
      toast.error("Failed to delete activity", {
        description: error.message,
      });
    },
    onSuccess: () => {
      // Invalidate to get updated order indices
      queryClient.invalidateQueries({ queryKey: ["plan", planId] });
      toast.success("Activity deleted successfully");
    },
  });
}
