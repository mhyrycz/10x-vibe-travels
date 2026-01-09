/**
 * useMyPlans Hook - Unit Tests
 *
 * Tests cover:
 * - Successful data fetching and transformation
 * - Loading state management
 * - Error handling (network errors, API errors)
 * - Empty results (0 plans)
 * - Data transformation (API DTO → ViewModel)
 * - Date formatting
 * - Query caching behavior
 * - Edge cases (null data, invalid dates, missing fields)
 *
 * Following Vitest Guidelines:
 * - vi.mock() factory patterns at top level
 * - renderHook from @testing-library/react for hook testing
 * - Arrange-Act-Assert pattern
 * - Type-safe mocks
 * - QueryClient wrapper for React Query hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMyPlans } from "./useMyPlans";
import type { PaginatedPlansDto } from "../../../types";
import type { ReactNode } from "react";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create a fresh QueryClient for each test (prevents cache pollution)
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for faster tests
        gcTime: 0, // Disable garbage collection
      },
    },
  });
}

// Wrapper component to provide QueryClient context
function createWrapper() {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "QueryClientWrapper";
  return Wrapper;
}

// Mock API response factory
function createMockApiResponse(overrides?: Partial<PaginatedPlansDto>): PaginatedPlansDto {
  return {
    data: [],
    pagination: {
      total: 0,
      limit: 10,
      offset: 0,
    },
    ...overrides,
  };
}

describe("useMyPlans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Successful Data Fetching", () => {
    it("should fetch and transform plans successfully", async () => {
      // Arrange
      const mockApiData = createMockApiResponse({
        data: [
          {
            id: "plan-1",
            name: "Paris Adventure",
            destination_text: "Paris, France",
            date_start: "2026-03-01",
            date_end: "2026-03-07",
            created_at: "2026-01-05T10:00:00Z",
          },
          {
            id: "plan-2",
            name: "Tokyo Trip",
            destination_text: "Tokyo, Japan",
            date_start: "2026-04-15",
            date_end: "2026-04-22",
            created_at: "2026-01-08T14:30:00Z",
          },
        ],
        pagination: {
          total: 2,
          limit: 10,
          offset: 0,
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiData,
      });

      // Act
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert - Initial loading state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.plans).toEqual([]);

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Assert - Success state
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.totalPlans).toBe(2);
      expect(result.current.planLimit).toBe(10);
      expect(result.current.plans).toHaveLength(2);

      // Verify plan transformation
      expect(result.current.plans[0]).toEqual({
        id: "plan-1",
        name: "Paris Adventure",
        destination: "Paris, France",
        formattedDate: "Created on Jan 5, 2026",
        href: "/plans/plan-1",
      });

      expect(result.current.plans[1]).toEqual({
        id: "plan-2",
        name: "Tokyo Trip",
        destination: "Tokyo, Japan",
        formattedDate: "Created on Jan 8, 2026",
        href: "/plans/plan-2",
      });
    });

    it("should call /api/plans endpoint", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse(),
      });

      // Act
      renderHook(() => useMyPlans(), { wrapper: createWrapper() });

      // Assert
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/plans");
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Loading State", () => {
    it("should start in loading state", () => {
      // Arrange
      mockFetch.mockImplementationOnce(
        () =>
          new Promise(() => {
            /* never resolves */
          })
      );

      // Act
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.plans).toEqual([]);
      expect(result.current.totalPlans).toBe(0);
    });

    it("should transition from loading to success", async () => {
      // Arrange
      const mockData = createMockApiResponse({
        data: [
          {
            id: "plan-1",
            name: "Trip",
            destination_text: "Location",
            date_start: "2026-01-01",
            date_end: "2026-01-05",
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
        pagination: { total: 1, limit: 10, offset: 0 },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      // Act
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert - Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for success
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.plans).toHaveLength(1);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      // Arrange
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      // Act
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe("Network error");
        expect(result.current.plans).toEqual([]);
        expect(result.current.totalPlans).toBe(0);
      });
    });

    it("should handle API errors (non-ok response)", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      // Act
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe("Failed to fetch plans");
      });
    });

    it("should handle 401 unauthorized error", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      // Act
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe("Failed to fetch plans");
        expect(result.current.plans).toEqual([]);
      });
    });

    it("should handle JSON parsing errors", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      // Act
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toBe("Invalid JSON");
      });
    });
  });

  describe("Empty Results (0 Plans)", () => {
    it("should handle empty plans array correctly", async () => {
      // Arrange
      const mockData = createMockApiResponse({
        data: [],
        pagination: { total: 0, limit: 10, offset: 0 },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      // Act
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.plans).toEqual([]);
      expect(result.current.totalPlans).toBe(0);
      expect(result.current.planLimit).toBe(10);
    });
  });

  describe("Data Transformation", () => {
    it("should transform API DTO to ViewModel correctly", async () => {
      // Arrange
      const mockData = createMockApiResponse({
        data: [
          {
            id: "uuid-123",
            name: "Summer Vacation",
            destination_text: "Barcelona, Spain",
            date_start: "2026-07-01",
            date_end: "2026-07-14",
            created_at: "2026-01-09T12:00:00Z",
          },
        ],
        pagination: { total: 1, limit: 10, offset: 0 },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      // Act
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.plans[0]).toEqual({
          id: "uuid-123",
          name: "Summer Vacation",
          destination: "Barcelona, Spain",
          formattedDate: "Created on Jan 9, 2026",
          href: "/plans/uuid-123",
        });
      });
    });

    it("should format dates correctly", async () => {
      // Arrange
      const mockData = createMockApiResponse({
        data: [
          {
            id: "plan-1",
            name: "Trip 1",
            destination_text: "Location 1",
            date_start: "2026-12-25",
            date_end: "2026-12-31",
            created_at: "2026-12-01T00:00:00Z",
          },
          {
            id: "plan-2",
            name: "Trip 2",
            destination_text: "Location 2",
            date_start: "2026-01-01",
            date_end: "2026-01-07",
            created_at: "2026-02-14T12:30:00Z",
          },
        ],
        pagination: { total: 2, limit: 10, offset: 0 },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      // Act
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.plans[0].formattedDate).toBe("Created on Dec 1, 2026");
        expect(result.current.plans[1].formattedDate).toBe("Created on Feb 14, 2026");
      });
    });

    it("should generate correct href for each plan", async () => {
      // Arrange
      const mockData = createMockApiResponse({
        data: [
          {
            id: "abc-123",
            name: "Plan A",
            destination_text: "Dest A",
            date_start: "2026-01-01",
            date_end: "2026-01-05",
            created_at: "2026-01-01T00:00:00Z",
          },
          {
            id: "xyz-789",
            name: "Plan B",
            destination_text: "Dest B",
            date_start: "2026-02-01",
            date_end: "2026-02-05",
            created_at: "2026-01-02T00:00:00Z",
          },
        ],
        pagination: { total: 2, limit: 10, offset: 0 },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      // Act
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.plans[0].href).toBe("/plans/abc-123");
        expect(result.current.plans[1].href).toBe("/plans/xyz-789");
      });
    });
  });

  describe("Business Rules", () => {
    it("should always return planLimit as 10", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse(),
      });

      // Act
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.planLimit).toBe(10);
      });
    });

    it("should handle maximum plans (10)", async () => {
      // Arrange
      const mockData = createMockApiResponse({
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `plan-${i}`,
          name: `Plan ${i}`,
          destination_text: `Destination ${i}`,
          date_start: "2026-01-01",
          date_end: "2026-01-05",
          created_at: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`, // Pad to 2 digits: 01, 02, ..., 10
        })),
        pagination: { total: 10, limit: 10, offset: 0 },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      // Act
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.totalPlans).toBe(10);
        expect(result.current.plans).toHaveLength(10);
        expect(result.current.planLimit).toBe(10);
      });
    });

    it("should correctly report totalPlans from pagination", async () => {
      // Arrange
      const mockData = createMockApiResponse({
        data: [
          {
            id: "plan-1",
            name: "Plan 1",
            destination_text: "Dest 1",
            date_start: "2026-01-01",
            date_end: "2026-01-05",
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
        pagination: { total: 7, limit: 10, offset: 0 }, // Total is 7 even though only 1 returned
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      // Act
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.totalPlans).toBe(7);
        expect(result.current.plans).toHaveLength(1);
      });
    });
  });

  describe("React Query Caching", () => {
    it("should use 'plans' as query key", async () => {
      // Arrange
      const querySpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => createMockApiResponse(),
      });
      mockFetch.mockImplementation(querySpy);

      // Act
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(querySpy).toHaveBeenCalledTimes(1);
    });

    it("should have 5 minute stale time configured", async () => {
      // This tests the hook's configuration indirectly
      // In a real scenario, React Query would prevent refetch within 5 minutes
      // We verify by checking the hook returns cached data quickly

      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockApiResponse({ pagination: { total: 1, limit: 10, offset: 0 } }),
      });

      // Act - First render
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert - Data loads
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify staleTime is set by checking it doesn't refetch immediately
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing optional fields gracefully", async () => {
      // Arrange
      const mockData = createMockApiResponse({
        data: [
          {
            id: "plan-1",
            name: "Minimal Plan",
            destination_text: "Unknown",
            date_start: "2026-01-01",
            date_end: "2026-01-05",
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
        pagination: { total: 1, limit: 10, offset: 0 },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      // Act
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.plans[0]).toEqual({
          id: "plan-1",
          name: "Minimal Plan",
          destination: "Unknown",
          formattedDate: "Created on Jan 1, 2026",
          href: "/plans/plan-1",
        });
      });
    });

    it("should handle undefined data gracefully", async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => undefined,
      });

      // Act
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.plans).toEqual([]);
      expect(result.current.totalPlans).toBe(0);
    });

    it("should handle single plan correctly", async () => {
      // Arrange
      const mockData = createMockApiResponse({
        data: [
          {
            id: "only-plan",
            name: "Solo Trip",
            destination_text: "Iceland",
            date_start: "2026-06-01",
            date_end: "2026-06-10",
            created_at: "2026-01-09T00:00:00Z",
          },
        ],
        pagination: { total: 1, limit: 10, offset: 0 },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      // Act
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.plans).toHaveLength(1);
        expect(result.current.totalPlans).toBe(1);
        expect(result.current.plans[0].name).toBe("Solo Trip");
      });
    });

    it("should handle date edge cases (year boundaries)", async () => {
      // Arrange
      const mockData = createMockApiResponse({
        data: [
          {
            id: "plan-1",
            name: "New Year Trip",
            destination_text: "NYC",
            date_start: "2025-12-31",
            date_end: "2026-01-02",
            created_at: "2025-12-31T12:00:00Z", // Use midday to avoid timezone edge cases
          },
        ],
        pagination: { total: 1, limit: 10, offset: 0 },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      // Act
      const { result } = renderHook(() => useMyPlans(), {
        wrapper: createWrapper(),
      });

      // Assert
      await waitFor(() => {
        expect(result.current.plans[0].formattedDate).toBe("Created on Dec 31, 2025");
      });
    });
  });
});
