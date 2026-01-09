/**
 * MyPlansView Component - Unit Tests
 *
 * Tests cover:
 * - Loading state rendering
 * - Error state handling and display
 * - Empty state (0 plans) with CTA
 * - Success state with plans grid
 * - Header visibility rules
 * - Plan limit display
 * - Edge cases (null/undefined data)
 *
 * Following Vitest Guidelines:
 * - vi.mock() factory patterns at top level
 * - Arrange-Act-Assert pattern
 * - Descriptive test names
 * - Type-safe mocks
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MyPlansView } from "./MyPlansView";
import type { MyPlansViewModel } from "./types";

// Mock the custom hook at the top level (factory pattern)
vi.mock("./hooks/useMyPlans");

// Mock child components to isolate MyPlansView logic
vi.mock("./HeaderSection", () => ({
  HeaderSection: ({ planCount, planLimit }: { planCount: number; planLimit: number }) => (
    <div data-testid="header-section">
      Header: {planCount}/{planLimit}
    </div>
  ),
}));

vi.mock("./PlanGrid", () => ({
  PlanGrid: ({ plans }: { plans: unknown[] }) => <div data-testid="plan-grid">Plans: {plans.length}</div>,
}));

vi.mock("./LoadingState", () => ({
  LoadingState: () => <div data-testid="loading-state">Loading...</div>,
}));

vi.mock("./EmptyState", () => ({
  EmptyState: ({ planLimit }: { planLimit: number }) => (
    <div data-testid="empty-state">No plans. Limit: {planLimit}</div>
  ),
}));

vi.mock("./ErrorState", () => ({
  ErrorState: ({ errorMessage }: { errorMessage: string }) => (
    <div data-testid="error-state">Error: {errorMessage}</div>
  ),
}));

describe("MyPlansView", () => {
  // Helper to mock the useMyPlans hook with custom return values
  const mockUseMyPlans = async (overrides: Partial<MyPlansViewModel> = {}) => {
    const { useMyPlans } = await import("./hooks/useMyPlans");
    vi.mocked(useMyPlans).mockReturnValue({
      isLoading: false,
      isError: false,
      error: null,
      plans: [],
      totalPlans: 0,
      planLimit: 10,
      ...overrides,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading State", () => {
    it("should display loading state when data is being fetched", async () => {
      // Arrange
      await mockUseMyPlans({ isLoading: true, plans: [], totalPlans: 0 });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.getByTestId("loading-state")).toBeInTheDocument();
      expect(screen.queryByTestId("plan-grid")).not.toBeInTheDocument();
      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
      expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
    });

    it("should display header section during loading", async () => {
      // Arrange
      await mockUseMyPlans({ isLoading: true, totalPlans: 5 });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.getByTestId("header-section")).toBeInTheDocument();
      expect(screen.getByText("Header: 5/10")).toBeInTheDocument();
    });
  });

  describe("Error State", () => {
    it("should display error state when fetch fails", async () => {
      // Arrange
      const errorMessage = "Failed to fetch plans";
      await mockUseMyPlans({
        isError: true,
        error: errorMessage,
        plans: [],
        totalPlans: 0,
      });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.getByTestId("error-state")).toBeInTheDocument();
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    });

    it("should display generic error message when error is null", async () => {
      // Arrange
      await mockUseMyPlans({
        isError: true,
        error: null,
        plans: [],
        totalPlans: 0,
      });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.getByText("Error: An unexpected error occurred")).toBeInTheDocument();
    });

    it("should NOT display header section when there is an error", async () => {
      // Arrange
      await mockUseMyPlans({
        isError: true,
        error: "Network error",
        totalPlans: 5,
      });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.queryByTestId("header-section")).not.toBeInTheDocument();
    });

    it("should hide loading and success states when error occurs", async () => {
      // Arrange
      await mockUseMyPlans({
        isError: true,
        error: "API error",
        plans: [],
      });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
      expect(screen.queryByTestId("plan-grid")).not.toBeInTheDocument();
      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    });
  });

  describe("Empty State (0 Plans)", () => {
    it("should display empty state when no plans exist", async () => {
      // Arrange
      await mockUseMyPlans({
        isLoading: false,
        isError: false,
        plans: [],
        totalPlans: 0,
      });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      expect(screen.getByText("No plans. Limit: 10")).toBeInTheDocument();
    });

    it("should display header section in empty state", async () => {
      // Arrange
      await mockUseMyPlans({
        plans: [],
        totalPlans: 0,
      });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.getByTestId("header-section")).toBeInTheDocument();
      expect(screen.getByText("Header: 0/10")).toBeInTheDocument();
    });

    it("should not display loading, error, or plan grid in empty state", async () => {
      // Arrange
      await mockUseMyPlans({
        plans: [],
        totalPlans: 0,
      });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
      expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
      expect(screen.queryByTestId("plan-grid")).not.toBeInTheDocument();
    });
  });

  describe("Success State (Plans Exist)", () => {
    it("should display plan grid when plans are loaded", async () => {
      // Arrange
      const mockPlans = [
        {
          id: "plan-1",
          name: "Paris Trip",
          destination: "Paris, France",
          formattedDate: "Created on Jan 1, 2026",
          href: "/plans/plan-1",
        },
        {
          id: "plan-2",
          name: "Tokyo Adventure",
          destination: "Tokyo, Japan",
          formattedDate: "Created on Jan 5, 2026",
          href: "/plans/plan-2",
        },
      ];

      await mockUseMyPlans({
        plans: mockPlans,
        totalPlans: 2,
      });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.getByTestId("plan-grid")).toBeInTheDocument();
      expect(screen.getByText("Plans: 2")).toBeInTheDocument();
    });

    it("should display header with correct plan count", async () => {
      // Arrange
      const mockPlans = Array.from({ length: 7 }, (_, i) => ({
        id: `plan-${i}`,
        name: `Trip ${i}`,
        destination: `Destination ${i}`,
        formattedDate: `Created on Jan ${i + 1}, 2026`,
        href: `/plans/plan-${i}`,
      }));

      await mockUseMyPlans({
        plans: mockPlans,
        totalPlans: 7,
      });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.getByText("Header: 7/10")).toBeInTheDocument();
    });

    it("should not display loading, error, or empty states when plans exist", async () => {
      // Arrange
      const mockPlans = [
        {
          id: "plan-1",
          name: "Trip 1",
          destination: "Location 1",
          formattedDate: "Created on Jan 1, 2026",
          href: "/plans/plan-1",
        },
      ];

      await mockUseMyPlans({
        plans: mockPlans,
        totalPlans: 1,
      });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
      expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    });
  });

  describe("Plan Limit Business Rules", () => {
    it("should display header when user has reached plan limit (10 plans)", async () => {
      // Arrange
      const mockPlans = Array.from({ length: 10 }, (_, i) => ({
        id: `plan-${i}`,
        name: `Trip ${i}`,
        destination: `Destination ${i}`,
        formattedDate: `Created on Jan ${i + 1}, 2026`,
        href: `/plans/plan-${i}`,
      }));

      await mockUseMyPlans({
        plans: mockPlans,
        totalPlans: 10,
        planLimit: 10,
      });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.getByText("Header: 10/10")).toBeInTheDocument();
      expect(screen.getByTestId("plan-grid")).toBeInTheDocument();
    });

    it("should show plan grid even at plan limit", async () => {
      // Arrange
      const mockPlans = Array.from({ length: 10 }, (_, i) => ({
        id: `plan-${i}`,
        name: `Trip ${i}`,
        destination: `Destination ${i}`,
        formattedDate: `Created on Jan ${i + 1}, 2026`,
        href: `/plans/plan-${i}`,
      }));

      await mockUseMyPlans({
        plans: mockPlans,
        totalPlans: 10,
      });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.getByTestId("plan-grid")).toBeInTheDocument();
      expect(screen.getByText("Plans: 10")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle transition from loading to success state", async () => {
      // Arrange - Initial loading state
      await mockUseMyPlans({ isLoading: true });
      const { rerender } = render(<MyPlansView />);

      expect(screen.getByTestId("loading-state")).toBeInTheDocument();

      // Act - Transition to success
      const mockPlans = [
        {
          id: "plan-1",
          name: "Trip 1",
          destination: "Location 1",
          formattedDate: "Created on Jan 1, 2026",
          href: "/plans/plan-1",
        },
      ];
      await mockUseMyPlans({ plans: mockPlans, totalPlans: 1 });
      rerender(<MyPlansView />);

      // Assert
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
      expect(screen.getByTestId("plan-grid")).toBeInTheDocument();
    });

    it("should handle single plan correctly", async () => {
      // Arrange
      const mockPlans = [
        {
          id: "only-plan",
          name: "Solo Trip",
          destination: "Iceland",
          formattedDate: "Created on Jan 9, 2026",
          href: "/plans/only-plan",
        },
      ];

      await mockUseMyPlans({
        plans: mockPlans,
        totalPlans: 1,
      });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.getByText("Header: 1/10")).toBeInTheDocument();
      expect(screen.getByText("Plans: 1")).toBeInTheDocument();
    });

    it("should not display empty state when totalPlans is 0 but still loading", async () => {
      // Arrange
      await mockUseMyPlans({
        isLoading: true,
        plans: [],
        totalPlans: 0,
      });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.getByTestId("loading-state")).toBeInTheDocument();
      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    });

    it("should prioritize error state over other states", async () => {
      // Arrange - Error with stale data
      const stalePlans = [
        {
          id: "stale-plan",
          name: "Stale Trip",
          destination: "Nowhere",
          formattedDate: "Created on Jan 1, 2026",
          href: "/plans/stale-plan",
        },
      ];

      await mockUseMyPlans({
        isError: true,
        error: "Network failure",
        plans: stalePlans, // Stale data from cache
        totalPlans: 1,
      });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.getByTestId("error-state")).toBeInTheDocument();
      expect(screen.queryByTestId("plan-grid")).not.toBeInTheDocument();
      expect(screen.queryByTestId("header-section")).not.toBeInTheDocument();
    });
  });

  describe("Conditional Header Display", () => {
    it("should show header in loading state", async () => {
      // Arrange
      await mockUseMyPlans({ isLoading: true });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.getByTestId("header-section")).toBeInTheDocument();
    });

    it("should show header in empty state", async () => {
      // Arrange
      await mockUseMyPlans({ plans: [], totalPlans: 0 });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.getByTestId("header-section")).toBeInTheDocument();
    });

    it("should show header in success state", async () => {
      // Arrange
      const mockPlans = [
        {
          id: "plan-1",
          name: "Trip",
          destination: "Place",
          formattedDate: "Created on Jan 1, 2026",
          href: "/plans/plan-1",
        },
      ];
      await mockUseMyPlans({ plans: mockPlans, totalPlans: 1 });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.getByTestId("header-section")).toBeInTheDocument();
    });

    it("should NOT show header in error state", async () => {
      // Arrange
      await mockUseMyPlans({ isError: true, error: "Error occurred" });

      // Act
      render(<MyPlansView />);

      // Assert
      expect(screen.queryByTestId("header-section")).not.toBeInTheDocument();
    });
  });
});
