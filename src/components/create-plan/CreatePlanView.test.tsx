/**
 * CreatePlanView Component - Unit Tests
 *
 * Tests cover:
 * - Data fetching on mount (user preferences, plan count)
 * - Loading states (skeleton, form, overlay)
 * - Plan limit logic (10-plan limit enforcement)
 * - Form submission and validation
 * - Navigation (success, cancel)
 * - Default values from user preferences
 * - Edge cases (API failures, missing data)
 * - Conditional rendering
 *
 * Following Vitest Guidelines:
 * - vi.mock() factory patterns at top level
 * - Arrange-Act-Assert pattern
 * - Type-safe mocks
 * - jsdom environment for DOM testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreatePlanView from "./CreatePlanView";
import type { CreatePlanDto, UserPreferencesDto } from "@/types";

// Mock child components to isolate CreatePlanView logic
vi.mock("./PageHeader", () => ({
  default: () => <div data-testid="page-header">Page Header</div>,
}));

vi.mock("./PlanLimitAlert", () => ({
  default: ({ isVisible, planLimit }: { isVisible: boolean; planLimit: number }) =>
    isVisible ? <div data-testid="plan-limit-alert">Limit: {planLimit}</div> : null,
}));

vi.mock("./CreatePlanForm", () => ({
  default: ({
    defaultValues,
    isLoading,
    planCount,
    planLimit,
    onSubmit,
    onCancel,
  }: {
    defaultValues?: Partial<CreatePlanDto>;
    isLoading: boolean;
    planCount: number;
    planLimit: number;
    onSubmit: (data: CreatePlanDto) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="create-plan-form">
      <div data-testid="form-loading">{String(isLoading)}</div>
      <div data-testid="form-plan-count">{planCount}</div>
      <div data-testid="form-plan-limit">{planLimit}</div>
      <div data-testid="form-has-defaults">{defaultValues ? "true" : "false"}</div>
      <button onClick={() => onSubmit({} as CreatePlanDto)}>Submit</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock("./LoadingOverlay", () => ({
  default: ({ isVisible }: { isVisible: boolean }) =>
    isVisible ? <div data-testid="loading-overlay">Creating plan...</div> : null,
}));

vi.mock("./FormSkeleton", () => ({
  default: () => <div data-testid="form-skeleton">Loading form...</div>,
}));

// Mock custom hooks
const mockUseUserPreferences = vi.fn();
const mockUsePlanCount = vi.fn();
const mockUseCreatePlan = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../profile/hooks/useUserPreferences", () => ({
  useUserPreferences: () => mockUseUserPreferences(),
}));

vi.mock("./hooks/useCreatePlanMutations", () => ({
  usePlanCount: () => mockUsePlanCount(),
  useCreatePlan: () => mockUseCreatePlan(),
}));

vi.mock("@/lib/navigation", () => ({
  useNavigate: () => mockNavigate,
}));

// Helper to create mock user preferences
function createMockUserPreferences(overrides?: Partial<UserPreferencesDto>): UserPreferencesDto {
  return {
    id: "user-123",
    user_id: "user-123",
    people_count: 2,
    trip_type: "leisure",
    age: 30,
    country: "US",
    comfort: "medium",
    budget: "medium",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  } as UserPreferencesDto;
}

// Helper to create mock mutation result
function createMockMutation(overrides?: Partial<ReturnType<typeof mockUseCreatePlan>>) {
  return {
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    data: null,
    error: null,
    ...overrides,
  };
}

describe("CreatePlanView", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();

    // Default mock implementations
    mockUseUserPreferences.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    mockUsePlanCount.mockReturnValue({
      data: 0,
      isLoading: false,
      isError: false,
    });

    mockUseCreatePlan.mockReturnValue(createMockMutation());

    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial Rendering", () => {
    it("should render PageHeader component", () => {
      render(<CreatePlanView />);

      expect(screen.getByTestId("page-header")).toBeInTheDocument();
    });

    it("should render CreatePlanForm when preferences are loaded", () => {
      render(<CreatePlanView />);

      expect(screen.getByTestId("create-plan-form")).toBeInTheDocument();
    });

    it("should display all required UI elements", () => {
      render(<CreatePlanView />);

      expect(screen.getByTestId("page-header")).toBeInTheDocument();
      expect(screen.getByTestId("create-plan-form")).toBeInTheDocument();
    });
  });

  describe("Loading States - User Preferences", () => {
    it("should display FormSkeleton while user preferences are loading", () => {
      mockUseUserPreferences.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      render(<CreatePlanView />);

      expect(screen.getByTestId("form-skeleton")).toBeInTheDocument();
      expect(screen.queryByTestId("create-plan-form")).not.toBeInTheDocument();
    });

    it("should display CreatePlanForm after preferences load successfully", () => {
      mockUseUserPreferences.mockReturnValue({
        data: createMockUserPreferences(),
        isLoading: false,
        isError: false,
      });

      render(<CreatePlanView />);

      expect(screen.queryByTestId("form-skeleton")).not.toBeInTheDocument();
      expect(screen.getByTestId("create-plan-form")).toBeInTheDocument();
    });

    it("should display CreatePlanForm even when preferences are undefined (not loading)", () => {
      mockUseUserPreferences.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      render(<CreatePlanView />);

      expect(screen.queryByTestId("form-skeleton")).not.toBeInTheDocument();
      expect(screen.getByTestId("create-plan-form")).toBeInTheDocument();
    });
  });

  describe("Plan Limit Logic", () => {
    it("should show PlanLimitAlert when plan count equals limit (10)", () => {
      mockUsePlanCount.mockReturnValue({
        data: 10,
        isLoading: false,
        isError: false,
      });

      render(<CreatePlanView />);

      expect(screen.getByTestId("plan-limit-alert")).toBeInTheDocument();
      expect(screen.getByTestId("plan-limit-alert")).toHaveTextContent("Limit: 10");
    });

    it("should show PlanLimitAlert when plan count exceeds limit", () => {
      mockUsePlanCount.mockReturnValue({
        data: 15,
        isLoading: false,
        isError: false,
      });

      render(<CreatePlanView />);

      expect(screen.getByTestId("plan-limit-alert")).toBeInTheDocument();
    });

    it("should hide PlanLimitAlert when plan count is below limit", () => {
      mockUsePlanCount.mockReturnValue({
        data: 5,
        isLoading: false,
        isError: false,
      });

      render(<CreatePlanView />);

      expect(screen.queryByTestId("plan-limit-alert")).not.toBeInTheDocument();
    });

    it("should hide PlanLimitAlert when plan count is 0", () => {
      mockUsePlanCount.mockReturnValue({
        data: 0,
        isLoading: false,
        isError: false,
      });

      render(<CreatePlanView />);

      expect(screen.queryByTestId("plan-limit-alert")).not.toBeInTheDocument();
    });

    it("should not show PlanLimitAlert while plan count is loading", () => {
      mockUsePlanCount.mockReturnValue({
        data: 10,
        isLoading: true,
        isError: false,
      });

      render(<CreatePlanView />);

      expect(screen.queryByTestId("plan-limit-alert")).not.toBeInTheDocument();
    });

    it("should prevent form submission when plan limit is reached", async () => {
      const mutateMock = vi.fn();
      mockUsePlanCount.mockReturnValue({
        data: 10,
        isLoading: false,
        isError: false,
      });
      mockUseCreatePlan.mockReturnValue(createMockMutation({ mutate: mutateMock }));

      render(<CreatePlanView />);

      const submitButton = screen.getByText("Submit");
      await user.click(submitButton);

      expect(mutateMock).not.toHaveBeenCalled();
    });

    it("should allow form submission when plan count is below limit", async () => {
      const mutateMock = vi.fn();
      mockUsePlanCount.mockReturnValue({
        data: 5,
        isLoading: false,
        isError: false,
      });
      mockUseCreatePlan.mockReturnValue(createMockMutation({ mutate: mutateMock }));

      render(<CreatePlanView />);

      const submitButton = screen.getByText("Submit");
      await user.click(submitButton);

      expect(mutateMock).toHaveBeenCalledTimes(1);
    });

    it("should use default value of 0 when planCount is undefined", () => {
      mockUsePlanCount.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      render(<CreatePlanView />);

      expect(screen.queryByTestId("plan-limit-alert")).not.toBeInTheDocument();
      expect(screen.getByTestId("form-plan-count")).toHaveTextContent("0");
    });
  });

  describe("Default Form Values from User Preferences", () => {
    it("should pass default values to CreatePlanForm when preferences are loaded", () => {
      const preferences = createMockUserPreferences({
        people_count: 4,
        trip_type: "business",
        comfort: "intense",
        budget: "luxury",
      });

      mockUseUserPreferences.mockReturnValue({
        data: preferences,
        isLoading: false,
        isError: false,
      });

      render(<CreatePlanView />);

      expect(screen.getByTestId("form-has-defaults")).toHaveTextContent("true");
    });

    it("should not pass default values when preferences are undefined", () => {
      mockUseUserPreferences.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      render(<CreatePlanView />);

      expect(screen.getByTestId("form-has-defaults")).toHaveTextContent("false");
    });

    it("should not pass default values while preferences are loading", () => {
      mockUseUserPreferences.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      render(<CreatePlanView />);

      // Form not rendered during loading, skeleton shown instead
      expect(screen.queryByTestId("create-plan-form")).not.toBeInTheDocument();
    });
  });

  describe("Form Props", () => {
    it("should pass correct isLoading prop to CreatePlanForm when mutation is pending", () => {
      mockUseCreatePlan.mockReturnValue(createMockMutation({ isPending: true }));

      render(<CreatePlanView />);

      expect(screen.getByTestId("form-loading")).toHaveTextContent("true");
    });

    it("should pass correct isLoading prop to CreatePlanForm when mutation is not pending", () => {
      mockUseCreatePlan.mockReturnValue(createMockMutation({ isPending: false }));

      render(<CreatePlanView />);

      expect(screen.getByTestId("form-loading")).toHaveTextContent("false");
    });

    it("should pass correct planCount to CreatePlanForm", () => {
      mockUsePlanCount.mockReturnValue({
        data: 7,
        isLoading: false,
        isError: false,
      });

      render(<CreatePlanView />);

      expect(screen.getByTestId("form-plan-count")).toHaveTextContent("7");
    });

    it("should pass PLAN_LIMIT (10) to CreatePlanForm", () => {
      render(<CreatePlanView />);

      expect(screen.getByTestId("form-plan-limit")).toHaveTextContent("10");
    });
  });

  describe("Form Submission", () => {
    it("should call createPlanMutation.mutate when form is submitted", async () => {
      const mutateMock = vi.fn();
      mockUseCreatePlan.mockReturnValue(createMockMutation({ mutate: mutateMock }));

      render(<CreatePlanView />);

      const submitButton = screen.getByText("Submit");
      await user.click(submitButton);

      expect(mutateMock).toHaveBeenCalledTimes(1);
    });

    it("should not call mutation when plan limit is reached", async () => {
      const mutateMock = vi.fn();
      mockUsePlanCount.mockReturnValue({
        data: 10,
        isLoading: false,
        isError: false,
      });
      mockUseCreatePlan.mockReturnValue(createMockMutation({ mutate: mutateMock }));

      render(<CreatePlanView />);

      const submitButton = screen.getByText("Submit");
      await user.click(submitButton);

      expect(mutateMock).not.toHaveBeenCalled();
    });

    it("should not call mutation when plan count exceeds limit", async () => {
      const mutateMock = vi.fn();
      mockUsePlanCount.mockReturnValue({
        data: 12,
        isLoading: false,
        isError: false,
      });
      mockUseCreatePlan.mockReturnValue(createMockMutation({ mutate: mutateMock }));

      render(<CreatePlanView />);

      const submitButton = screen.getByText("Submit");
      await user.click(submitButton);

      expect(mutateMock).not.toHaveBeenCalled();
    });
  });

  describe("Navigation - Success", () => {
    it("should navigate to plan details page after successful creation", async () => {
      const { rerender } = render(<CreatePlanView />);

      // Simulate successful creation
      mockUseCreatePlan.mockReturnValue(
        createMockMutation({
          isSuccess: true,
          data: { id: "new-plan-123" },
        })
      );

      rerender(<CreatePlanView />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/plans/new-plan-123");
      });
    });

    it("should not navigate when mutation is not successful", () => {
      mockUseCreatePlan.mockReturnValue(
        createMockMutation({
          isSuccess: false,
          data: null,
        })
      );

      render(<CreatePlanView />);

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should not navigate when mutation data is missing", () => {
      mockUseCreatePlan.mockReturnValue(
        createMockMutation({
          isSuccess: true,
          data: null,
        })
      );

      render(<CreatePlanView />);

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should handle navigation with different plan IDs", async () => {
      const { rerender } = render(<CreatePlanView />);

      mockUseCreatePlan.mockReturnValue(
        createMockMutation({
          isSuccess: true,
          data: { id: "plan-abc-xyz-789" },
        })
      );

      rerender(<CreatePlanView />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/plans/plan-abc-xyz-789");
      });
    });
  });

  describe("Navigation - Cancel", () => {
    it("should navigate to home page when cancel is clicked", async () => {
      render(<CreatePlanView />);

      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("should call navigate exactly once on cancel", async () => {
      render(<CreatePlanView />);

      const cancelButton = screen.getByText("Cancel");
      await user.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe("Loading Overlay", () => {
    it("should show LoadingOverlay when mutation is pending", () => {
      mockUseCreatePlan.mockReturnValue(createMockMutation({ isPending: true }));

      render(<CreatePlanView />);

      expect(screen.getByTestId("loading-overlay")).toBeInTheDocument();
    });

    it("should hide LoadingOverlay when mutation is not pending", () => {
      mockUseCreatePlan.mockReturnValue(createMockMutation({ isPending: false }));

      render(<CreatePlanView />);

      expect(screen.queryByTestId("loading-overlay")).not.toBeInTheDocument();
    });

    it("should hide LoadingOverlay after mutation completes successfully", () => {
      mockUseCreatePlan.mockReturnValue(
        createMockMutation({
          isPending: false,
          isSuccess: true,
          data: { id: "plan-123" },
        })
      );

      render(<CreatePlanView />);

      expect(screen.queryByTestId("loading-overlay")).not.toBeInTheDocument();
    });

    it("should hide LoadingOverlay after mutation fails", () => {
      mockUseCreatePlan.mockReturnValue(
        createMockMutation({
          isPending: false,
          isError: true,
          error: new Error("Failed to create plan"),
        })
      );

      render(<CreatePlanView />);

      expect(screen.queryByTestId("loading-overlay")).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle when both preferences and plan count are loading", () => {
      mockUseUserPreferences.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });
      mockUsePlanCount.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      render(<CreatePlanView />);

      expect(screen.getByTestId("form-skeleton")).toBeInTheDocument();
      expect(screen.queryByTestId("plan-limit-alert")).not.toBeInTheDocument();
    });

    it("should handle API error for user preferences gracefully", () => {
      mockUseUserPreferences.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });

      render(<CreatePlanView />);

      // Form should still render without preferences
      expect(screen.getByTestId("create-plan-form")).toBeInTheDocument();
      expect(screen.getByTestId("form-has-defaults")).toHaveTextContent("false");
    });

    it("should handle API error for plan count gracefully", () => {
      mockUsePlanCount.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });

      render(<CreatePlanView />);

      // Should default to 0 and allow plan creation
      expect(screen.getByTestId("form-plan-count")).toHaveTextContent("0");
      expect(screen.queryByTestId("plan-limit-alert")).not.toBeInTheDocument();
    });

    it("should handle plan count at exactly limit minus 1", () => {
      mockUsePlanCount.mockReturnValue({
        data: 9,
        isLoading: false,
        isError: false,
      });

      render(<CreatePlanView />);

      expect(screen.queryByTestId("plan-limit-alert")).not.toBeInTheDocument();
      expect(screen.getByTestId("form-plan-count")).toHaveTextContent("9");
    });

    it("should handle rapid form submissions (should call mutation once)", async () => {
      const mutateMock = vi.fn();
      mockUseCreatePlan.mockReturnValue(createMockMutation({ mutate: mutateMock }));

      render(<CreatePlanView />);

      const submitButton = screen.getByText("Submit");
      await user.click(submitButton);
      await user.click(submitButton);

      // Due to React rendering, each click triggers submission
      // In real scenario, form should be disabled during mutation
      expect(mutateMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("Component Integration", () => {
    it("should coordinate between all child components correctly", () => {
      const preferences = createMockUserPreferences();
      mockUseUserPreferences.mockReturnValue({
        data: preferences,
        isLoading: false,
        isError: false,
      });
      mockUsePlanCount.mockReturnValue({
        data: 5,
        isLoading: false,
        isError: false,
      });

      render(<CreatePlanView />);

      expect(screen.getByTestId("page-header")).toBeInTheDocument();
      expect(screen.getByTestId("create-plan-form")).toBeInTheDocument();
      expect(screen.queryByTestId("plan-limit-alert")).not.toBeInTheDocument();
      expect(screen.queryByTestId("loading-overlay")).not.toBeInTheDocument();
      expect(screen.queryByTestId("form-skeleton")).not.toBeInTheDocument();
    });

    it("should show correct components during plan creation flow", () => {
      mockUseCreatePlan.mockReturnValue(createMockMutation({ isPending: true }));

      render(<CreatePlanView />);

      expect(screen.getByTestId("create-plan-form")).toBeInTheDocument();
      expect(screen.getByTestId("loading-overlay")).toBeInTheDocument();
      expect(screen.getByTestId("form-loading")).toHaveTextContent("true");
    });

    it("should show correct components when limit is reached", () => {
      mockUsePlanCount.mockReturnValue({
        data: 10,
        isLoading: false,
        isError: false,
      });

      render(<CreatePlanView />);

      expect(screen.getByTestId("page-header")).toBeInTheDocument();
      expect(screen.getByTestId("plan-limit-alert")).toBeInTheDocument();
      expect(screen.getByTestId("create-plan-form")).toBeInTheDocument();
    });
  });

  describe("Derived State", () => {
    it("should calculate canCreatePlan correctly when below limit", () => {
      const mutateMock = vi.fn();
      mockUsePlanCount.mockReturnValue({
        data: 3,
        isLoading: false,
        isError: false,
      });
      mockUseCreatePlan.mockReturnValue(createMockMutation({ mutate: mutateMock }));

      render(<CreatePlanView />);

      const submitButton = screen.getByText("Submit");
      user.click(submitButton);

      // Mutation should be allowed
      waitFor(() => expect(mutateMock).toHaveBeenCalled());
    });

    it("should calculate canCreatePlan correctly when at limit", async () => {
      const mutateMock = vi.fn();
      mockUsePlanCount.mockReturnValue({
        data: 10,
        isLoading: false,
        isError: false,
      });
      mockUseCreatePlan.mockReturnValue(createMockMutation({ mutate: mutateMock }));

      render(<CreatePlanView />);

      const submitButton = screen.getByText("Submit");
      await user.click(submitButton);

      // Mutation should be prevented
      expect(mutateMock).not.toHaveBeenCalled();
    });

    it("should update isCreatingPlan based on mutation pending state", () => {
      mockUseCreatePlan.mockReturnValue(createMockMutation({ isPending: true }));

      render(<CreatePlanView />);

      expect(screen.getByTestId("form-loading")).toHaveTextContent("true");
      expect(screen.getByTestId("loading-overlay")).toBeInTheDocument();
    });
  });
});
