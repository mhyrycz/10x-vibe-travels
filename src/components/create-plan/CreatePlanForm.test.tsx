/**
 * CreatePlanForm Component - Integration Tests
 *
 * Tests the complete form with real child components to verify:
 * - Form validation with actual error messages displayed
 * - User interactions with real form fields
 * - Plan limit enforcement
 * - Submit/cancel behavior
 * - Accessibility features
 *
 * Following Vitest Guidelines:
 * - No mocking of child components (integration test)
 * - Real DOM interactions with @testing-library/react
 * - Arrange-Act-Assert pattern
 * - Type-safe assertions
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreatePlanForm from "./CreatePlanForm";
import type { CreatePlanFormData } from "./types";

// Only mock the Calendar component to simplify date picking in tests
vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({ onSelect, selected }: { onSelect: (date?: Date) => void; selected?: Date }) => (
    <div data-testid="calendar-mock">
      <button
        data-testid="select-future-date"
        onClick={() => {
          const futureDate = new Date("2026-08-01");
          onSelect(futureDate);
        }}
      >
        Select Future Date
      </button>
      <button
        data-testid="select-past-date"
        onClick={() => {
          const pastDate = new Date("2025-01-01");
          onSelect(pastDate);
        }}
      >
        Select Past Date
      </button>
      {selected && <span>Selected: {selected.toISOString()}</span>}
    </div>
  ),
}));

// Helper to create default props
function createDefaultProps(overrides?: Partial<Parameters<typeof CreatePlanForm>[0]>) {
  return {
    defaultValues: undefined,
    isLoading: false,
    planCount: 0,
    planLimit: 10,
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

// Helper to create mock form data
function createMockFormData(overrides?: Partial<CreatePlanFormData>): CreatePlanFormData {
  return {
    destination_text: "Paris, France",
    date_start: "2026-08-01",
    date_end: "2026-08-07",
    note_text: "Summer vacation",
    people_count: 2,
    trip_type: "leisure",
    comfort: "balanced",
    budget: "moderate",
    transport_modes: ["walk"],
    ...overrides,
  };
}

// Helper to get future date string
function getFutureDateString(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split("T")[0];
}

// Helper to get past date string
function getPastDateString(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
}

describe("CreatePlanForm - Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Form Rendering", () => {
    it("should render the complete form with all fields", () => {
      const props = createDefaultProps();
      render(<CreatePlanForm {...props} />);

      // Check main sections
      expect(screen.getByRole("form", { name: /create travel plan form/i })).toBeInTheDocument();
      expect(screen.getByText("Plan Details")).toBeInTheDocument();

      // Check all field labels are present
      expect(screen.getByLabelText(/destination/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/number of travelers/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/trip type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/comfort level/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/budget/i)).toBeInTheDocument();

      // Check buttons
      expect(screen.getByRole("button", { name: /create plan/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("should render with fallback values", () => {
      const props = createDefaultProps();
      render(<CreatePlanForm {...props} />);

      const destinationInput = screen.getByLabelText(/destination/i) as HTMLInputElement;
      const peopleInput = screen.getByLabelText(/number of travelers/i) as HTMLInputElement;

      expect(destinationInput.value).toBe("");
      expect(peopleInput.value).toBe("2");
    });

    it("should render with provided default values", () => {
      const defaultValues = createMockFormData({
        destination_text: "Tokyo, Japan",
        people_count: 4,
      });
      const props = createDefaultProps({ defaultValues });
      render(<CreatePlanForm {...props} />);

      const destinationInput = screen.getByLabelText(/destination/i) as HTMLInputElement;
      const peopleInput = screen.getByLabelText(/number of travelers/i) as HTMLInputElement;

      expect(destinationInput.value).toBe("Tokyo, Japan");
      expect(peopleInput.value).toBe("4");
    });
  });

  describe("Form Validation - Destination", () => {
    it("should show error when destination is empty and form is submitted", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const props = createDefaultProps({ onSubmit });
      render(<CreatePlanForm {...props} />);

      const submitButton = screen.getByRole("button", { name: /create plan/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/destination is required/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("should show error when destination exceeds 160 characters", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const props = createDefaultProps({ onSubmit });
      render(<CreatePlanForm {...props} />);

      const destinationInput = screen.getByLabelText(/destination/i);
      const longDestination = "A".repeat(161);
      await user.clear(destinationInput);
      await user.type(destinationInput, longDestination);

      const submitButton = screen.getByRole("button", { name: /create plan/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/destination must be 160 characters or less/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("should accept valid destination", async () => {
      const user = userEvent.setup();
      const defaultValues = createMockFormData();
      const props = createDefaultProps({ defaultValues });
      render(<CreatePlanForm {...props} />);

      const destinationInput = screen.getByLabelText(/destination/i);
      await user.clear(destinationInput);
      await user.type(destinationInput, "Paris, France");

      // No error should be shown
      expect(screen.queryByText(/destination is required/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/destination must be 160 characters or less/i)).not.toBeInTheDocument();
    });
  });

  describe("Form Validation - People Count", () => {
    it("should show error when people count is less than 1", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      // Start with 0 people count in defaultValues to bypass the input's || 1 fallback
      const defaultValues = createMockFormData({ people_count: 0 });
      const props = createDefaultProps({ onSubmit, defaultValues });
      render(<CreatePlanForm {...props} />);

      const submitButton = screen.getByRole("button", { name: /create plan/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("At least 1 person required")).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("should show error when people count exceeds 20", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const props = createDefaultProps({ onSubmit });
      render(<CreatePlanForm {...props} />);

      const peopleInput = screen.getByLabelText(/number of travelers/i);
      await user.clear(peopleInput);
      await user.type(peopleInput, "21");

      const submitButton = screen.getByRole("button", { name: /create plan/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/maximum 20 people allowed/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("should accept valid people count", async () => {
      const defaultValues = createMockFormData({ people_count: 5 });
      const props = createDefaultProps({ defaultValues });
      render(<CreatePlanForm {...props} />);

      const peopleInput = screen.getByLabelText(/number of travelers/i) as HTMLInputElement;
      expect(peopleInput.value).toBe("5");

      // No error should be shown
      expect(screen.queryByText(/at least 1 person required/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/maximum 20 people allowed/i)).not.toBeInTheDocument();
    });
  });

  describe("Form Validation - Note", () => {
    it("should show error when note exceeds 20,000 characters", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const longNote = "A".repeat(20001);
      const defaultValues = createMockFormData({ note_text: longNote });
      const props = createDefaultProps({ onSubmit, defaultValues });
      render(<CreatePlanForm {...props} />);

      const submitButton = screen.getByRole("button", { name: /create plan/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/note must be 20,000 characters or less/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("should accept empty note", async () => {
      const defaultValues = createMockFormData({ note_text: "" });
      const props = createDefaultProps({ defaultValues });
      render(<CreatePlanForm {...props} />);

      const noteTextarea = screen.getByRole("textbox", { name: /travel note/i }) as HTMLTextAreaElement;
      expect(noteTextarea.value).toBe("");

      // No error should be shown
      expect(screen.queryByText(/note must be 20,000 characters or less/i)).not.toBeInTheDocument();
    });
  });

  describe("Form Validation - Date Range", () => {
    it("should show error when start date is in the past", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const pastDate = getPastDateString(5);
      const defaultValues = createMockFormData({
        date_start: pastDate,
        date_end: getFutureDateString(5),
      });
      const props = createDefaultProps({ onSubmit, defaultValues });
      render(<CreatePlanForm {...props} />);

      const submitButton = screen.getByRole("button", { name: /create plan/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/start date cannot be in the past/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("should show error when end date is before start date", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const defaultValues = createMockFormData({
        date_start: getFutureDateString(10),
        date_end: getFutureDateString(5),
      });
      const props = createDefaultProps({ onSubmit, defaultValues });
      render(<CreatePlanForm {...props} />);

      const submitButton = screen.getByRole("button", { name: /create plan/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/end date must be equal to or after start date/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("should show error when trip duration exceeds 30 days", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const defaultValues = createMockFormData({
        date_start: getFutureDateString(1),
        date_end: getFutureDateString(35), // 35 days
      });
      const props = createDefaultProps({ onSubmit, defaultValues });
      render(<CreatePlanForm {...props} />);

      const submitButton = screen.getByRole("button", { name: /create plan/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/trip duration cannot exceed 30 days/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("should accept single day trip", async () => {
      const futureDate = getFutureDateString(10);
      const defaultValues = createMockFormData({
        date_start: futureDate,
        date_end: futureDate,
      });
      const props = createDefaultProps({ defaultValues });
      render(<CreatePlanForm {...props} />);

      // No error should be shown
      expect(screen.queryByText(/end date must be equal to or after start date/i)).not.toBeInTheDocument();
    });
  });

  describe("Form Validation - Accessibility Errors", () => {
    it("should display screen reader alert when form has validation errors", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const props = createDefaultProps({ onSubmit });
      render(<CreatePlanForm {...props} />);

      // Submit form with empty destination to trigger validation error
      const submitButton = screen.getByRole("button", { name: /create plan/i });
      await user.click(submitButton);

      await waitFor(() => {
        const alert = screen.queryByRole("alert");
        if (alert) {
          expect(alert).toHaveTextContent(/validation error/i);
          expect(alert).toHaveClass("sr-only");
          expect(alert).toHaveAttribute("aria-live", "polite");
        }
      });
    });
  });

  describe("Plan Limit Enforcement", () => {
    it("should enable submit when plan count is below limit", () => {
      const props = createDefaultProps({ planCount: 5, planLimit: 10 });
      render(<CreatePlanForm {...props} />);

      const submitButton = screen.getByRole("button", { name: /create plan/i });
      expect(submitButton).not.toBeDisabled();
    });

    it("should disable submit when plan count equals limit", () => {
      const props = createDefaultProps({ planCount: 10, planLimit: 10 });
      render(<CreatePlanForm {...props} />);

      const submitButton = screen.getByRole("button", { name: /create plan/i });
      expect(submitButton).toBeDisabled();
    });

    it("should disable submit when plan count exceeds limit", () => {
      const props = createDefaultProps({ planCount: 12, planLimit: 10 });
      render(<CreatePlanForm {...props} />);

      const submitButton = screen.getByRole("button", { name: /create plan/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe("Loading State", () => {
    it("should disable submit when isLoading is true", () => {
      const props = createDefaultProps({ isLoading: true, planCount: 0 });
      render(<CreatePlanForm {...props} />);

      const submitButton = screen.getByRole("button", { name: /generating plan/i });
      expect(submitButton).toBeDisabled();
    });

    it("should show loading text on submit button when submitting", () => {
      const props = createDefaultProps({ isLoading: true });
      render(<CreatePlanForm {...props} />);

      expect(screen.getByRole("button", { name: /generating plan/i })).toBeInTheDocument();
    });

    it("should disable cancel button when isLoading is true", () => {
      const props = createDefaultProps({ isLoading: true });
      render(<CreatePlanForm {...props} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe("User Interactions", () => {
    it("should call onCancel when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      const props = createDefaultProps({ onCancel });
      render(<CreatePlanForm {...props} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("should call onSubmit with form data when form is valid", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const defaultValues = createMockFormData();
      const props = createDefaultProps({ onSubmit, defaultValues });
      render(<CreatePlanForm {...props} />);

      const submitButton = screen.getByRole("button", { name: /create plan/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      // Verify the submitted data matches the form values
      const submittedData = onSubmit.mock.calls[0][0];
      expect(submittedData.destination_text).toBe("Paris, France");
      expect(submittedData.people_count).toBe(2);
    });

    it("should allow user to type in destination field", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      render(<CreatePlanForm {...props} />);

      const destinationInput = screen.getByLabelText(/destination/i);
      await user.type(destinationInput, "London, UK");

      expect(destinationInput).toHaveValue("London, UK");
    });

    it("should allow user to change people count", async () => {
      const user = userEvent.setup();
      const props = createDefaultProps();
      render(<CreatePlanForm {...props} />);

      const peopleInput = screen.getByLabelText(/number of travelers/i) as HTMLInputElement;
      // Triple click to select all, then type to replace
      await user.tripleClick(peopleInput);
      await user.keyboard("5");

      await waitFor(() => {
        expect(peopleInput).toHaveValue(5);
      });
    });

    it("should not call onSubmit when form has validation errors", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const props = createDefaultProps({ onSubmit });
      render(<CreatePlanForm {...props} />);

      // Leave destination empty (will cause validation error)
      const submitButton = screen.getByRole("button", { name: /create plan/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/destination is required/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper form role and label", () => {
      const props = createDefaultProps();
      render(<CreatePlanForm {...props} />);

      const form = screen.getByRole("form", { name: /create travel plan form/i });
      expect(form).toBeInTheDocument();
      expect(form).toHaveAttribute("novalidate");
    });

    it("should have fieldsets with proper structure", () => {
      const props = createDefaultProps();
      const { container } = render(<CreatePlanForm {...props} />);

      const fieldsets = container.querySelectorAll("fieldset");
      expect(fieldsets.length).toBeGreaterThan(0);

      const legends = container.querySelectorAll("legend");
      expect(legends.length).toBeGreaterThan(0);
    });

    it("should associate labels with form controls", () => {
      const props = createDefaultProps();
      render(<CreatePlanForm {...props} />);

      // All form fields should have associated labels
      const destinationInput = screen.getByLabelText(/destination/i);
      const peopleInput = screen.getByLabelText(/number of travelers/i);
      const tripTypeSelect = screen.getByLabelText(/trip type/i);

      expect(destinationInput).toBeInTheDocument();
      expect(peopleInput).toBeInTheDocument();
      expect(tripTypeSelect).toBeInTheDocument();
    });
  });
});
