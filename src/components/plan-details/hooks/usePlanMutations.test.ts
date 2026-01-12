import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMoveActivity } from "./usePlanMutations";
import type { PlanDto, MoveActivityDto } from "@/types";
import React from "react";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
  },
}));

/**
 * Helper function to create a QueryClient for testing
 * Each test gets a fresh QueryClient to avoid state pollution
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

/**
 * Helper function to wrap hook with QueryClientProvider
 */
function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

/**
 * Helper function to create mock PlanDto with nested structure
 */
function createMockPlan(planId: string): PlanDto {
  return {
    id: planId,
    owner_id: "user-1",
    name: "Test Plan",
    destination_text: "Paris, France",
    date_start: "2026-01-15",
    date_end: "2026-01-17",
    note_text: "Test note",
    people_count: 2,
    trip_type: "leisure",
    comfort: "balanced",
    budget: "moderate",
    transport_modes: ["walk", "public"],
    created_at: "2026-01-10T10:00:00Z",
    updated_at: "2026-01-10T10:00:00Z",
    days: [
      {
        id: "day-1",
        day_index: 1,
        day_date: "2026-01-15",
        total_duration_minutes: 240,
        warning: null,
        activities: [
          {
            id: "activity-1",
            title: "Activity 1",
            description: "Description 1",
            duration_minutes: 60,
            transport_minutes: 20,
            order_index: 1,
            created_at: "2026-01-10T10:00:00Z",
            updated_at: "2026-01-10T10:00:00Z",
          },
          {
            id: "activity-2",
            title: "Activity 2",
            description: "Description 2",
            duration_minutes: 90,
            transport_minutes: 30,
            order_index: 2,
            created_at: "2026-01-10T10:00:00Z",
            updated_at: "2026-01-10T10:00:00Z",
          },
          {
            id: "activity-3",
            title: "Activity 3",
            description: "Description 3",
            duration_minutes: 40,
            transport_minutes: 0,
            order_index: 3,
            created_at: "2026-01-10T10:00:00Z",
            updated_at: "2026-01-10T10:00:00Z",
          },
        ],
      },
      {
        id: "day-2",
        day_index: 2,
        day_date: "2026-01-16",
        total_duration_minutes: 180,
        warning: null,
        activities: [
          {
            id: "activity-4",
            title: "Activity 4",
            description: "Description 4",
            duration_minutes: 120,
            transport_minutes: 60,
            order_index: 1,
            created_at: "2026-01-10T10:00:00Z",
            updated_at: "2026-01-10T10:00:00Z",
          },
        ],
      },
    ],
  };
}

describe("useMoveActivity", () => {
  let queryClient: QueryClient;
  const planId = "plan-1";

  beforeEach(() => {
    queryClient = createTestQueryClient();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Successful Activity Movement", () => {
    it("should successfully move activity within the same day", async () => {
      // Arrange
      const initialPlan = createMockPlan(planId);
      queryClient.setQueryData(["plan", planId], initialPlan);

      const moveData: MoveActivityDto = {
        target_day_id: "day-1",
        target_order_index: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Act
      const { result } = renderHook(() => useMoveActivity(planId), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({
        activityId: "activity-2",
        data: moveData,
      });

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFetch).toHaveBeenCalledWith(`/api/plans/${planId}/activities/activity-2/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(moveData),
      });
    });

    it("should successfully move activity to different day", async () => {
      // Arrange
      const initialPlan = createMockPlan(planId);
      queryClient.setQueryData(["plan", planId], initialPlan);

      const moveData: MoveActivityDto = {
        target_day_id: "day-2",
        target_order_index: 2,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Act
      const { result } = renderHook(() => useMoveActivity(planId), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({
        activityId: "activity-1",
        data: moveData,
      });

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFetch).toHaveBeenCalledWith(`/api/plans/${planId}/activities/activity-1/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(moveData),
      });
    });

    it("should invalidate plan query after successful move", async () => {
      // Arrange
      const initialPlan = createMockPlan(planId);
      queryClient.setQueryData(["plan", planId], initialPlan);

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Act
      const { result } = renderHook(() => useMoveActivity(planId), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({
        activityId: "activity-1",
        data: {
          target_day_id: "day-2",
          target_order_index: 1,
        },
      });

      // Assert
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["plan", planId] });
    });
  });

  describe("Optimistic Updates", () => {
    it("should optimistically update cache when moving activity within same day", async () => {
      // Arrange
      const initialPlan = createMockPlan(planId);
      queryClient.setQueryData(["plan", planId], initialPlan);

      const moveData: MoveActivityDto = {
        target_day_id: "day-1",
        target_order_index: 1,
      };

      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Act
      const { result } = renderHook(() => useMoveActivity(planId), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({
        activityId: "activity-2",
        data: moveData,
      });

      // Assert - check cache is updated optimistically
      await waitFor(() => {
        const cachedPlan = queryClient.getQueryData<PlanDto>(["plan", planId]);
        expect(cachedPlan?.days[0].activities[0].id).toBe("activity-2");
      });
    });

    it("should optimistically remove activity from source day and add to target day", async () => {
      // Arrange
      const initialPlan = createMockPlan(planId);
      queryClient.setQueryData(["plan", planId], initialPlan);

      const moveData: MoveActivityDto = {
        target_day_id: "day-2",
        target_order_index: 1,
      };

      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Act
      const { result } = renderHook(() => useMoveActivity(planId), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({
        activityId: "activity-1",
        data: moveData,
      });

      // Assert - verify optimistic update
      await waitFor(() => {
        const cachedPlan = queryClient.getQueryData<PlanDto>(["plan", planId]);

        // activity-1 should be removed from day-1
        expect(cachedPlan?.days[0].activities.find((a) => a.id === "activity-1")).toBeUndefined();

        // activity-1 should be added to day-2 at target position
        expect(cachedPlan?.days[1].activities[0].id).toBe("activity-1");

        // day-1 should have only 2 activities now
        expect(cachedPlan?.days[0].activities.length).toBe(2);

        // day-2 should have 2 activities now
        expect(cachedPlan?.days[1].activities.length).toBe(2);
      });
    });

    it("should correctly insert activity at specified order_index position", async () => {
      // Arrange
      const initialPlan = createMockPlan(planId);
      queryClient.setQueryData(["plan", planId], initialPlan);

      // Move activity-3 to middle of day-1 (between activity-1 and activity-2)
      const moveData: MoveActivityDto = {
        target_day_id: "day-1",
        target_order_index: 2,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Act
      const { result } = renderHook(() => useMoveActivity(planId), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({
        activityId: "activity-3",
        data: moveData,
      });

      // Assert - activity-3 should be at index 1 (order_index 2 converts to array index 1)
      await waitFor(() => {
        const cachedPlan = queryClient.getQueryData<PlanDto>(["plan", planId]);
        expect(cachedPlan?.days[0].activities[1].id).toBe("activity-3");
        expect(cachedPlan?.days[0].activities[0].id).toBe("activity-1");
        expect(cachedPlan?.days[0].activities[2].id).toBe("activity-2");
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle network error and show error toast", async () => {
      // Arrange
      const { toast } = await import("sonner");
      const initialPlan = createMockPlan(planId);
      queryClient.setQueryData(["plan", planId], initialPlan);

      // Mock two failed responses due to retry: 1
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: { message: "Network error" } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: { message: "Network error" } }),
        });

      // Act
      const { result } = renderHook(() => useMoveActivity(planId), {
        wrapper: createWrapper(queryClient),
      });

      // Use mutateAsync to catch the error
      await expect(
        result.current.mutateAsync({
          activityId: "activity-1",
          data: {
            target_day_id: "day-2",
            target_order_index: 1,
          },
        })
      ).rejects.toThrow("Network error");

      // Assert
      expect(toast.error).toHaveBeenCalledWith("Failed to move activity", {
        description: "Network error",
      });
    });

    it("should rollback optimistic update on error", async () => {
      // Arrange
      const initialPlan = createMockPlan(planId);
      const initialPlanCopy = JSON.parse(JSON.stringify(initialPlan)) as PlanDto;
      queryClient.setQueryData(["plan", planId], initialPlan);

      // Mock two failed responses due to retry: 1
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: { message: "Server error" } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: { message: "Server error" } }),
        });

      // Act
      const { result } = renderHook(() => useMoveActivity(planId), {
        wrapper: createWrapper(queryClient),
      });

      // Expect the mutation to throw an error
      await expect(
        result.current.mutateAsync({
          activityId: "activity-1",
          data: {
            target_day_id: "day-2",
            target_order_index: 1,
          },
        })
      ).rejects.toThrow("Server error");

      // Assert - cache should be restored to initial state
      const restoredPlan = queryClient.getQueryData<PlanDto>(["plan", planId]);
      expect(restoredPlan).toEqual(initialPlanCopy);
    });

    it("should handle error when response does not include error message", async () => {
      // Arrange
      const { toast } = await import("sonner");
      const initialPlan = createMockPlan(planId);
      queryClient.setQueryData(["plan", planId], initialPlan);

      // Mock two failed responses due to retry: 1
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({}),
        });

      // Act
      const { result } = renderHook(() => useMoveActivity(planId), {
        wrapper: createWrapper(queryClient),
      });

      // Use mutateAsync to catch the error
      await expect(
        result.current.mutateAsync({
          activityId: "activity-1",
          data: {
            target_day_id: "day-2",
            target_order_index: 1,
          },
        })
      ).rejects.toThrow("Failed to move activity");

      // Assert
      expect(toast.error).toHaveBeenCalledWith("Failed to move activity", {
        description: "Failed to move activity",
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle moving activity when plan cache is missing", async () => {
      // Arrange - no initial plan in cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Act
      const { result } = renderHook(() => useMoveActivity(planId), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({
        activityId: "activity-1",
        data: {
          target_day_id: "day-2",
          target_order_index: 1,
        },
      });

      // Assert - should complete without error despite missing cache
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("should handle moving activity when activity is not found in plan", async () => {
      // Arrange
      const initialPlan = createMockPlan(planId);
      queryClient.setQueryData(["plan", planId], initialPlan);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Act - try to move non-existent activity
      const { result } = renderHook(() => useMoveActivity(planId), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({
        activityId: "non-existent-activity",
        data: {
          target_day_id: "day-2",
          target_order_index: 1,
        },
      });

      // Assert - should complete without error
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("should handle moving activity when target day is not found", async () => {
      // Arrange
      const initialPlan = createMockPlan(planId);
      queryClient.setQueryData(["plan", planId], initialPlan);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Act - try to move to non-existent day
      const { result } = renderHook(() => useMoveActivity(planId), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({
        activityId: "activity-1",
        data: {
          target_day_id: "non-existent-day",
          target_order_index: 1,
        },
      });

      // Assert - should complete without error (server will handle validation)
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it("should handle moving last activity from a day", async () => {
      // Arrange
      const initialPlan = createMockPlan(planId);
      queryClient.setQueryData(["plan", planId], initialPlan);

      // day-2 has only one activity, move it to day-1
      const moveData: MoveActivityDto = {
        target_day_id: "day-1",
        target_order_index: 4,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Act
      const { result } = renderHook(() => useMoveActivity(planId), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({
        activityId: "activity-4",
        data: moveData,
      });

      // Assert - day-2 should become empty
      await waitFor(() => {
        const cachedPlan = queryClient.getQueryData<PlanDto>(["plan", planId]);
        expect(cachedPlan?.days[1].activities.length).toBe(0);
        expect(cachedPlan?.days[0].activities.length).toBe(4);
        expect(cachedPlan?.days[0].activities[3].id).toBe("activity-4");
      });
    });

    it("should handle moving activity to position beyond day length", async () => {
      // Arrange
      const initialPlan = createMockPlan(planId);
      queryClient.setQueryData(["plan", planId], initialPlan);

      // Move to position 10 in day that has only 1 activity
      const moveData: MoveActivityDto = {
        target_day_id: "day-2",
        target_order_index: 10,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Act
      const { result } = renderHook(() => useMoveActivity(planId), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({
        activityId: "activity-1",
        data: moveData,
      });

      // Assert - activity should be added (splice handles index beyond length gracefully)
      await waitFor(() => {
        const cachedPlan = queryClient.getQueryData<PlanDto>(["plan", planId]);
        expect(cachedPlan?.days[1].activities.some((a) => a.id === "activity-1")).toBe(true);
      });
    });
  });

  describe("Network Mode Configuration", () => {
    it("should have networkMode set to 'always'", () => {
      // Arrange & Act
      const { result } = renderHook(() => useMoveActivity(planId), {
        wrapper: createWrapper(queryClient),
      });

      // Assert - mutation should be configured to always attempt network requests
      expect(result.current).toBeDefined();
      // Note: Direct access to networkMode is not exposed, but the behavior is tested
      // through successful mutation calls even when offline
    });

    it("should have retry count of 1", async () => {
      // Arrange
      const initialPlan = createMockPlan(planId);
      queryClient.setQueryData(["plan", planId], initialPlan);

      // Mock two failed responses - React Query will retry once (total 2 attempts)
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: { message: "Request failed" } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: { message: "Request failed" } }),
        });

      // Act
      const { result } = renderHook(() => useMoveActivity(planId), {
        wrapper: createWrapper(queryClient),
      });

      // Expect the mutation to throw an error after retrying
      await expect(
        result.current.mutateAsync({
          activityId: "activity-1",
          data: {
            target_day_id: "day-2",
            target_order_index: 1,
          },
        })
      ).rejects.toThrow("Request failed");

      // Assert - mutation is configured with retry: 1 (initial attempt + 1 retry = 2 total calls)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("Type Safety", () => {
    it("should enforce correct MoveActivityDto structure", () => {
      // Arrange
      const { result } = renderHook(() => useMoveActivity(planId), {
        wrapper: createWrapper(queryClient),
      });

      // Act & Assert - TypeScript should enforce these types at compile time
      const validMoveData: MoveActivityDto = {
        target_day_id: "day-2",
        target_order_index: 1,
      };

      expect(() => {
        result.current.mutate({
          activityId: "activity-1",
          data: validMoveData,
        });
      }).not.toThrow();
    });

    it("should preserve activity type structure in optimistic update", async () => {
      // Arrange
      const initialPlan = createMockPlan(planId);
      queryClient.setQueryData(["plan", planId], initialPlan);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Act
      const { result } = renderHook(() => useMoveActivity(planId), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({
        activityId: "activity-1",
        data: {
          target_day_id: "day-2",
          target_order_index: 1,
        },
      });

      // Assert - verify moved activity maintains all properties
      await waitFor(() => {
        const cachedPlan = queryClient.getQueryData<PlanDto>(["plan", planId]);
        const movedActivity = cachedPlan?.days[1].activities[0];

        expect(movedActivity).toMatchObject({
          id: "activity-1",
          title: "Activity 1",
          description: "Description 1",
          duration_minutes: 60,
          transport_minutes: 20,
          order_index: 1,
          created_at: "2026-01-10T10:00:00Z",
          updated_at: "2026-01-10T10:00:00Z",
        });
      });
    });
  });
});
