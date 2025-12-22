import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UpdatePlanDto, UpdateActivityDto, MoveActivityDto, RegeneratePlanDto, PlanDto } from "@/types";

/**
 * Hook for updating plan metadata (name, budget, note_text, people_count)
 * PATCH /api/plans/{planId}
 */
export function useUpdatePlan(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
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
            blocks: day.blocks.map((block) => ({
              ...block,
              activities: block.activities.map((activity) =>
                activity.id === activityId ? { ...activity, ...data } : activity
              ),
            })),
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
 * Hook for moving activity to different block/position
 * POST /api/plans/{planId}/activities/{activityId}/move
 */
export function useMoveActivity(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
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
        type ActivityType = PlanDto["days"][0]["blocks"][0]["activities"][0];
        let activityToMove: ActivityType | null = null;
        let sourceDayIndex = -1;
        let sourceBlockIndex = -1;
        let sourceActivityIndex = -1;

        // Find the activity to move
        previousPlan.days.forEach((day, dIdx) => {
          day.blocks.forEach((block, bIdx) => {
            block.activities.forEach((activity, aIdx) => {
              if (activity.id === activityId) {
                activityToMove = activity;
                sourceDayIndex = dIdx;
                sourceBlockIndex = bIdx;
                sourceActivityIndex = aIdx;
              }
            });
          });
        });

        if (activityToMove) {
          // Remove from source
          const updatedPlan = JSON.parse(JSON.stringify(previousPlan)) as PlanDto;
          updatedPlan.days[sourceDayIndex].blocks[sourceBlockIndex].activities.splice(sourceActivityIndex, 1);

          // Add to target
          type DayType = PlanDto["days"][0];
          type BlockType = DayType["blocks"][0];
          const targetDay = updatedPlan.days.find((day: DayType) =>
            day.blocks.some((block: BlockType) => block.id === data.target_block_id)
          );
          if (targetDay) {
            const targetBlock = targetDay.blocks.find((block: BlockType) => block.id === data.target_block_id);
            if (targetBlock) {
              const activity = activityToMove as ActivityType;
              // Note: ActivityDto omits block_id, no need to set it in optimistic update
              targetBlock.activities.splice(data.target_order_index, 0, activity);
            }
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
 * This is a destructive operation that replaces all days/blocks/activities
 * No optimistic update as the entire structure changes
 */
export function useRegeneratePlan(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
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
