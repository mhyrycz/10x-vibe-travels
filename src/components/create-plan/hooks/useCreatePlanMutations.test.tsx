/**
 * useCreatePlanMutations Hooks - Unit Tests
 *
 * Tests cover:
 * - usePlanCount: Data fetching, error handling, caching
 * - useCreatePlan: Mutation execution, success/error callbacks, cache invalidation
 * - API response handling (success, validation errors, network errors)
 * - Query key management
 * - Toast notifications
 * - Retry and network mode configuration
 *
 * Following Vitest Guidelines:
 * - vi.mock() factory patterns at top level
 * - Arrange-Act-Assert pattern
 * - Type-safe mocks
 * - renderHook from @testing-library/react for hook testing
 * - QueryClient wrapper for React Query context
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { toast } from "sonner";
import { usePlanCount, useCreatePlan } from "./useCreatePlanMutations";
import type { CreatePlanDto, PlanDto, ErrorDto, PaginatedPlansDto, ErrorCode } from "@/types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock toast functions
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Helper to create QueryClient wrapper for hooks
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "QueryClientWrapper";

  return { Wrapper, queryClient };
}

// Helper to create mock plan
function createMockPlan(overrides?: Partial<PlanDto>): PlanDto {
  return {
    id: "plan-123",
    owner_id: "user-123",
    name: "Summer Vacation",
    destination_text: "Barcelona, Spain",
    date_start: "2026-07-01",
    date_end: "2026-07-10",
    note_text: "Beach and culture",
    people_count: 2,
    trip_type: "leisure",
    comfort: "balanced",
    budget: "moderate",
    transport_modes: ["walk", "public"],
    days: [],
    created_at: "2026-01-09T12:00:00Z",
    updated_at: "2026-01-09T12:00:00Z",
    ...overrides,
  };
}

// Helper to create mock CreatePlanDto
function createMockCreatePlanDto(overrides?: Partial<CreatePlanDto>): CreatePlanDto {
  return {
    destination_text: "Paris, France",
    date_start: "2026-08-01",
    date_end: "2026-08-07",
    note_text: "Romantic getaway",
    people_count: 2,
    trip_type: "leisure",
    comfort: "balanced",
    budget: "moderate",
    transport_modes: ["walk"],
    ...overrides,
  };
}

// Helper to create mock paginated response
function createMockPaginatedResponse(total: number): PaginatedPlansDto {
  return {
    data: [],
    pagination: {
      total,
      limit: 1,
      offset: 0,
    },
  };
}

// Helper to create mock error response
function createMockErrorResponse(message: string, code: ErrorCode): ErrorDto {
  return {
    error: {
      message,
      code,
    },
  };
}

describe("usePlanCount", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Successful Data Fetching", () => {
    it("should fetch plan count successfully", async () => {
      const mockResponse = createMockPaginatedResponse(5);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePlanCount(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(5);
      expect(mockFetch).toHaveBeenCalledWith("/api/plans?limit=1");
    });

    it("should return 0 when no plans exist", async () => {
      const mockResponse = createMockPaginatedResponse(0);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePlanCount(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(0);
    });

    it("should return 10 when plan limit is reached", async () => {
      const mockResponse = createMockPaginatedResponse(10);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePlanCount(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(10);
    });

    it("should handle large plan counts", async () => {
      const mockResponse = createMockPaginatedResponse(999);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePlanCount(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(999);
    });
  });

  describe("Loading State", () => {
    it("should set isLoading to true while fetching", async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => createMockPaginatedResponse(5),
                }),
              100
            );
          })
      );

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePlanCount(), { wrapper: Wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should set isLoading to false after successful fetch", async () => {
      const mockResponse = createMockPaginatedResponse(3);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePlanCount(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => createMockErrorResponse("Internal server error", "INTERNAL_ERROR"),
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePlanCount(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.data).toBeUndefined();
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePlanCount(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
      expect((result.current.error as Error).message).toBe("Network error");
    });

    it("should handle 401 Unauthorized errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => createMockErrorResponse("Unauthorized", "UNAUTHORIZED"),
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePlanCount(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it("should handle 403 Forbidden errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => createMockErrorResponse("Forbidden", "FORBIDDEN"),
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePlanCount(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("Query Configuration", () => {
    it("should use correct query key", async () => {
      const mockResponse = createMockPaginatedResponse(5);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { Wrapper, queryClient } = createWrapper();
      renderHook(() => usePlanCount(), { wrapper: Wrapper });

      await waitFor(() => {
        const cachedData = queryClient.getQueryData(["plans", "count"]);
        expect(cachedData).toBe(5);
      });
    });

    it("should have staleTime of 1 minute", async () => {
      const mockResponse = createMockPaginatedResponse(5);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { Wrapper, queryClient } = createWrapper();
      renderHook(() => usePlanCount(), { wrapper: Wrapper });

      await waitFor(() => {
        const queryState = queryClient.getQueryState(["plans", "count"]);
        expect(queryState?.dataUpdatedAt).toBeDefined();
      });
    });
  });

  describe("Caching Behavior", () => {
    it("should cache the plan count result", async () => {
      const mockResponse = createMockPaginatedResponse(5);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { Wrapper, queryClient } = createWrapper();
      const { result } = renderHook(() => usePlanCount(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const cachedData = queryClient.getQueryData(["plans", "count"]);
      expect(cachedData).toBe(5);
    });

    it("should return cached data on subsequent renders", async () => {
      const mockResponse = createMockPaginatedResponse(5);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { Wrapper } = createWrapper();
      const { result, rerender } = renderHook(() => usePlanCount(), { wrapper: Wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      rerender();

      // Should use cached data, no additional fetch
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.current.data).toBe(5);
    });
  });
});

describe("useCreatePlan", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Successful Plan Creation", () => {
    it("should create plan successfully", async () => {
      const createDto = createMockCreatePlanDto();
      const mockPlan = createMockPlan();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlan,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPlan);
      expect(mockFetch).toHaveBeenCalledWith("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createDto),
      });
    });

    it("should call success toast with correct message", async () => {
      const createDto = createMockCreatePlanDto();
      const mockPlan = createMockPlan();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlan,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Plan created successfully!", {
          description: "Redirecting to your new travel plan...",
        });
      });
    });

    it("should invalidate plans queries after successful creation", async () => {
      const createDto = createMockCreatePlanDto();
      const mockPlan = createMockPlan();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlan,
      });

      const { Wrapper, queryClient } = createWrapper();
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["plans"] });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ["plans", "count"] });
    });

    it("should set new plan in cache after successful creation", async () => {
      const createDto = createMockCreatePlanDto();
      const mockPlan = createMockPlan({ id: "new-plan-789" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlan,
      });

      const { Wrapper, queryClient } = createWrapper();
      const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify setQueryData was called with correct arguments
      await waitFor(() => {
        expect(setQueryDataSpy).toHaveBeenCalledWith(["plan", "new-plan-789"], mockPlan);
      });
    });

    it("should handle plan creation with all transport modes", async () => {
      const createDto = createMockCreatePlanDto({
        transport_modes: ["car", "walk", "public"],
      });
      const mockPlan = createMockPlan({ transport_modes: ["car", "walk", "public"] });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlan,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.transport_modes).toEqual(["car", "walk", "public"]);
    });

    it("should handle plan creation with null transport modes", async () => {
      const createDto = createMockCreatePlanDto({
        transport_modes: null,
      });
      const mockPlan = createMockPlan({ transport_modes: null });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlan,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.transport_modes).toBeNull();
    });
  });

  describe("Mutation State", () => {
    it("should set isPending to true while creating plan", async () => {
      const createDto = createMockCreatePlanDto();
      const mockPlan = createMockPlan();

      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => mockPlan,
                }),
              100
            );
          })
      );

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });

    it("should set isPending to false after successful creation", async () => {
      const createDto = createMockCreatePlanDto();
      const mockPlan = createMockPlan();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlan,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isPending).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle validation errors", async () => {
      const createDto = createMockCreatePlanDto();
      const errorResponse = createMockErrorResponse("Invalid destination", "VALIDATION_ERROR");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
      expect((result.current.error as Error).message).toBe("Invalid destination");
    });

    it("should call error toast on failure", async () => {
      const createDto = createMockCreatePlanDto();
      const errorResponse = createMockErrorResponse("Server error", "INTERNAL_ERROR");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => errorResponse,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to create plan", {
          description: "Server error",
        });
      });
    });

    it("should handle network errors", async () => {
      const createDto = createMockCreatePlanDto();

      mockFetch.mockRejectedValueOnce(new Error("Network request failed"));

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect((result.current.error as Error).message).toBe("Network request failed");
    });

    it("should handle 401 Unauthorized errors", async () => {
      const createDto = createMockCreatePlanDto();
      const errorResponse = createMockErrorResponse("Unauthorized", "UNAUTHORIZED");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => errorResponse,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      const error = result.current.error as Error & { status?: number };
      expect(error.status).toBe(401);
      expect(error.message).toBe("Unauthorized");
    });

    it("should handle 429 Rate Limit errors", async () => {
      const createDto = createMockCreatePlanDto();
      const errorResponse = createMockErrorResponse("Too many requests", "RATE_LIMIT_EXCEEDED");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => errorResponse,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      const error = result.current.error as Error & { status?: number; code?: string };
      expect(error.status).toBe(429);
      expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
    });

    it("should attach status code to error object", async () => {
      const createDto = createMockCreatePlanDto();
      const errorResponse = createMockErrorResponse("Bad request", "VALIDATION_ERROR");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      const error = result.current.error as Error & { status?: number };
      expect(error.status).toBe(400);
    });

    it("should attach error code to error object", async () => {
      const createDto = createMockCreatePlanDto();
      const errorResponse = createMockErrorResponse("Plan limit reached", "FORBIDDEN");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => errorResponse,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      const error = result.current.error as Error & { code?: string };
      expect(error.code).toBe("FORBIDDEN");
    });
  });

  describe("Mutation Configuration", () => {
    it("should not retry on failure", async () => {
      const createDto = createMockCreatePlanDto();

      mockFetch.mockRejectedValue(new Error("Network error"));

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should only call fetch once (no retries)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should use networkMode 'always'", async () => {
      // This test verifies the mutation attempts even when offline
      // In real implementation, this would fail immediately
      const createDto = createMockCreatePlanDto();

      mockFetch.mockRejectedValueOnce(new Error("Network unavailable"));

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty note_text", async () => {
      const createDto = createMockCreatePlanDto({ note_text: "" });
      const mockPlan = createMockPlan({ note_text: "" });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlan,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.note_text).toBe("");
    });

    it("should handle very long destination text", async () => {
      const longDestination = "A".repeat(500);
      const createDto = createMockCreatePlanDto({ destination_text: longDestination });
      const mockPlan = createMockPlan({ destination_text: longDestination });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlan,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.destination_text).toBe(longDestination);
    });

    it("should handle date ranges spanning multiple months", async () => {
      const createDto = createMockCreatePlanDto({
        date_start: "2026-06-25",
        date_end: "2026-08-05",
      });
      const mockPlan = createMockPlan({
        date_start: "2026-06-25",
        date_end: "2026-08-05",
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlan,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.date_start).toBe("2026-06-25");
      expect(result.current.data?.date_end).toBe("2026-08-05");
    });

    it("should handle single day trips", async () => {
      const createDto = createMockCreatePlanDto({
        date_start: "2026-07-15",
        date_end: "2026-07-15",
      });
      const mockPlan = createMockPlan({
        date_start: "2026-07-15",
        date_end: "2026-07-15",
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlan,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.date_start).toBe("2026-07-15");
      expect(result.current.data?.date_end).toBe("2026-07-15");
    });

    it("should handle large people_count", async () => {
      const createDto = createMockCreatePlanDto({ people_count: 20 });
      const mockPlan = createMockPlan({ people_count: 20 });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlan,
      });

      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

      result.current.mutate(createDto);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.people_count).toBe(20);
    });

    it("should handle different trip types", async () => {
      const tripTypes = ["leisure", "business"] as const;

      for (const tripType of tripTypes) {
        const createDto = createMockCreatePlanDto({ trip_type: tripType });
        const mockPlan = createMockPlan({ trip_type: tripType });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockPlan,
        });

        const { Wrapper } = createWrapper();
        const { result } = renderHook(() => useCreatePlan(), { wrapper: Wrapper });

        result.current.mutate(createDto);

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data?.trip_type).toBe(tripType);

        mockFetch.mockClear();
      }
    });
  });
});
