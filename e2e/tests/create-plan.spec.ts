/**
 * E2E Tests for First-Time User - Create Plan Flow
 *
 * Tests the complete create plan scenario for a newly registered user:
 * - Login with test credentials
 * - Complete preferences onboarding
 * - Navigate to create plan page
 * - Fill out plan form
 * - Submit the form
 * - Verify plan creation and redirection
 *
 * Following Playwright best practices:
 * - Page Object Model for maintainability
 * - Resilient locators with data-testid
 * - Browser context isolation
 * - Specific matchers for assertions
 * - Database cleanup after tests
 */

import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { PreferencesOnboardingPage } from "../pages/PreferencesOnboardingPage";
import { CreatePlanPage } from "../pages/CreatePlanPage";
import { UserMenuComponent } from "../components/UserMenuComponent";
import { DatabaseHelper } from "../helpers/DatabaseHelper";

// Hardcoded test dates for consistent E2E testing
const TEST_DATES = {
  START_DATE: new Date(2026, 5, 15), // June 15, 2026
  END_DATE: new Date(2026, 5, 22), // June 22, 2026
  ALT_START_DATE: new Date(2026, 6, 1), // July 1, 2026
  ALT_END_DATE: new Date(2026, 6, 10), // July 10, 2026
  SHORT_TRIP_START: new Date(2026, 4, 20), // May 20, 2026
  SHORT_TRIP_END: new Date(2026, 4, 23), // May 23, 2026
};

// Test setup and teardown
test.describe("First-Time User - Create Plan Flow", () => {
  let loginPage: LoginPage;
  let preferencesPage: PreferencesOnboardingPage;
  let createPlanPage: CreatePlanPage;
  let userMenu: UserMenuComponent;
  let dbHelper: DatabaseHelper;

  test.beforeEach(async ({ page }) => {
    dbHelper = new DatabaseHelper();

    // Fix the current date to June 1, 2026 for consistent testing using Playwright's clock
    await page.clock.install({ time: new Date("2026-03-14T12:00:00Z") });

    // Initialize page objects
    loginPage = new LoginPage(page);
    preferencesPage = new PreferencesOnboardingPage(page);
    createPlanPage = new CreatePlanPage(page);
    userMenu = new UserMenuComponent(page);
  });

  test.describe("Authenticated User - Plan Creation", () => {
    test.beforeEach(async ({ page }) => {
      // Clean up before starting
      await dbHelper.cleanupUserPreferences();
      await dbHelper.cleanupTravelPlans();

      // Login
      const testEmail = process.env.E2E_USERNAME;
      const testPassword = process.env.E2E_PASSWORD;

      if (!testEmail || !testPassword) {
        throw new Error("E2E_USERNAME and E2E_PASSWORD must be set in .env.test");
      }

      await loginPage.navigate();
      await loginPage.login(testEmail, testPassword);
      await expect(userMenu.trigger).toBeVisible();

      // Complete onboarding preferences
      await preferencesPage.navigate();
      await preferencesPage.fillAndSubmit({
        peopleCount: 2,
        tripType: "leisure",
        age: 30,
        country: "United States",
        comfort: "balanced",
        budget: "moderate",
      });

      // Wait for redirect to new plan page
      await page.waitForURL("/plans/new", { timeout: 10000 });
    });

    test("should display create plan page with all form elements", async () => {
      // // await createPlanPage.navigate();

      // Verify header elements
      await expect(createPlanPage.header).toBeVisible();
      await expect(createPlanPage.heading).toBeVisible();
      await expect(createPlanPage.heading).toHaveText("Create New Travel Plan");
      await expect(createPlanPage.breadcrumb).toBeVisible();

      // Verify form container
      await expect(createPlanPage.card).toBeVisible();
      await expect(createPlanPage.cardTitle).toBeVisible();
      await expect(createPlanPage.form).toBeVisible();

      // Verify all sections are visible
      await expect(createPlanPage.destinationField).toBeVisible();
      await expect(createPlanPage.dateRangeSection).toBeVisible();
      await expect(createPlanPage.preferencesSection).toBeVisible();
      await expect(createPlanPage.transportSection).toBeVisible();
      await expect(createPlanPage.travelNoteField).toBeVisible();
      await expect(createPlanPage.formActions).toBeVisible();
    });

    test("should have preferences pre-filled from onboarding", async () => {
      // // await createPlanPage.navigate();

      // Verify people count is pre-filled
      await expect(createPlanPage.peopleCountInput).toHaveValue("2");

      // Verify trip type is pre-filled
      await expect(createPlanPage.tripTypeSelect).toHaveText("Leisure");

      // Verify comfort is pre-filled
      await expect(createPlanPage.comfortSelect).toHaveText(/Balanced/);

      // Verify budget is pre-filled
      await expect(createPlanPage.budgetSelect).toHaveText(/Moderate/);
    });

    test("should validate required destination field", async () => {
      // // await createPlanPage.navigate();

      // Try to submit without destination
      await createPlanPage.submit();

      // Verify error message
      await expect(createPlanPage.destinationError).toBeVisible();
      await expect(createPlanPage.destinationError).toContainText(/required/i);
    });

    test("should validate required date fields", async () => {
      // // await createPlanPage.navigate();

      // Fill only destination
      await createPlanPage.fillDestination("Paris, France");

      // Try to submit without dates
      await createPlanPage.submit();

      // Verify error messages for dates
      await expect(createPlanPage.dateStartError).toBeVisible();
      await expect(createPlanPage.dateEndError).toBeVisible();
    });

    test("should allow date selection from date picker", async ({ page }) => {
      await createPlanPage.navigate();

      // Select start date
      await createPlanPage.selectStartDate(TEST_DATES.START_DATE);
      await expect(createPlanPage.dateStartButton).not.toContainText("Pick a date");
      // Verify calendar is closed
      await expect(page.locator('[data-state="open"]')).not.toBeVisible();

      // Select end date
      await createPlanPage.selectEndDate(TEST_DATES.END_DATE);
      await expect(createPlanPage.dateEndButton).not.toContainText("Pick a date");
      // Verify calendar is closed
      await expect(page.locator('[data-state="open"]')).not.toBeVisible();
    });

    test("should allow modifying people count", async () => {
      // await createPlanPage.navigate();

      // Change people count
      await createPlanPage.setPeopleCount(4);
      await expect(createPlanPage.peopleCountInput).toHaveValue("4");
    });

    test("should allow changing trip type", async () => {
      // await createPlanPage.navigate();

      // Change to business trip
      await createPlanPage.selectTripType("business");
      await expect(createPlanPage.tripTypeSelect).toHaveText("Business");
    });

    test("should allow changing comfort level", async () => {
      // await createPlanPage.navigate();

      // Change comfort to relax
      await createPlanPage.selectComfort("relax");
      await expect(createPlanPage.comfortSelect).toHaveText(/Relax/);
    });

    test("should allow changing budget level", async () => {
      // await createPlanPage.navigate();

      // Change budget to luxury
      await createPlanPage.selectBudget("luxury");
      await expect(createPlanPage.budgetSelect).toHaveText(/Luxury/);
    });

    test("should allow selecting multiple transport modes", async () => {
      // await createPlanPage.navigate();

      // Select car
      await createPlanPage.transportCarCheckbox.check();
      await expect(createPlanPage.transportCarCheckbox).toBeChecked();

      // Select public transport
      await createPlanPage.transportPublicCheckbox.check();
      await expect(createPlanPage.transportPublicCheckbox).toBeChecked();

      // Both should remain checked
      await expect(createPlanPage.transportCarCheckbox).toBeChecked();
      await expect(createPlanPage.transportPublicCheckbox).toBeChecked();
    });

    test("should allow filling travel note with character counter", async () => {
      // await createPlanPage.navigate();

      const note = "I want to visit the Eiffel Tower and Louvre Museum.";
      await createPlanPage.fillTravelNote(note);

      // Verify textarea has content
      await expect(createPlanPage.travelNoteTextarea).toHaveValue(note);

      // Verify character counter is visible and showing count
      await expect(createPlanPage.travelNoteCounter).toBeVisible();
      await expect(createPlanPage.travelNoteCounter).toContainText(note.length.toString());
    });

    test("should successfully create a plan with minimal data", async ({ page }) => {
      await createPlanPage.navigate();

      // Fill required fields only
      await createPlanPage.fillDestination("Barcelona, Spain");
      await createPlanPage.selectStartDate(TEST_DATES.START_DATE);
      await createPlanPage.selectEndDate(TEST_DATES.END_DATE);

      // Submit form
      await createPlanPage.submit();

      // Wait for navigation to plan details page
      await page.waitForURL(/\/plans\/[a-f0-9-]+$/, { timeout: 30000 });

      // Verify we're on a plan details page
      expect(page.url()).toMatch(/\/plans\/[a-f0-9-]+$/);
    });

    test("should successfully create a plan with all fields filled", async ({ page }) => {
      await createPlanPage.navigate();

      // Fill all form fields
      await createPlanPage.fillAndSubmit({
        destination: "Tokyo, Japan",
        dateStart: TEST_DATES.ALT_START_DATE,
        dateEnd: TEST_DATES.ALT_END_DATE,
        peopleCount: 3,
        tripType: "leisure",
        comfort: "intense",
        budget: "moderate",
        transport: ["car", "public"],
        travelNote:
          "I want to experience authentic Japanese culture, visit temples, try local food, and see cherry blossoms if possible.",
      });

      // Wait for navigation to plan details page
      await page.waitForURL(/\/plans\/[a-f0-9-]+$/, { timeout: 30000 });

      // Verify we're on a plan details page
      expect(page.url()).toMatch(/\/plans\/[a-f0-9-]+$/);
    });

    test("should show loading state during plan generation", async ({ page }) => {
      await createPlanPage.navigate();

      // Fill form
      await createPlanPage.fillCompleteForm({
        destination: "Rome, Italy",
        dateStart: TEST_DATES.SHORT_TRIP_START,
        dateEnd: TEST_DATES.SHORT_TRIP_END,
        peopleCount: 2,
        tripType: "leisure",
        comfort: "balanced",
        budget: "moderate",
      });

      // Submit and immediately check for loading state
      await createPlanPage.submit();

      // Verify submit button shows loading state
      await expect(createPlanPage.submitButton).toContainText("Generating Plan");
      await expect(createPlanPage.submitButton).toBeDisabled();

      // Wait for completion
      await page.waitForURL(/\/plans\/[a-f0-9-]+$/, { timeout: 30000 });
    });

    test("should allow canceling plan creation", async ({ page }) => {
      // await createPlanPage.navigate();

      // Fill some fields
      await createPlanPage.fillDestination("London, UK");

      // Click cancel
      await createPlanPage.cancel();

      // Verify we're redirected to home page
      await page.waitForURL("/");
      expect(page.url()).toContain("/");
      expect(page.url()).not.toContain("/plans/new");
    });
  });

  test.describe("Form Validation", () => {
    test.beforeEach(async ({ page }) => {
      // Clean up before starting
      await dbHelper.cleanupUserPreferences();
      await dbHelper.cleanupTravelPlans();

      // Login
      const testEmail = process.env.E2E_USERNAME;
      const testPassword = process.env.E2E_PASSWORD;

      if (!testEmail || !testPassword) {
        throw new Error("E2E_USERNAME and E2E_PASSWORD must be set in .env.test");
      }

      await loginPage.navigate();
      await loginPage.login(testEmail, testPassword);
      await expect(userMenu.trigger).toBeVisible();

      // Complete onboarding preferences
      await preferencesPage.navigate();
      await preferencesPage.fillAndSubmit({
        peopleCount: 2,
        tripType: "leisure",
        age: 30,
        country: "United States",
        comfort: "balanced",
        budget: "moderate",
      });

      // Wait for redirect to new plan page
      await page.waitForURL("/plans/new", { timeout: 10000 });
    });

    test.skip("should validate destination minimum length", async () => {
      // Fill with very short destination
      await createPlanPage.fillDestination("AB");

      await createPlanPage.submit();

      // Verify error message
      await expect(createPlanPage.destinationError).toBeVisible();
      await expect(createPlanPage.destinationError).toContainText(/at least/i);
    });

    test.skip("should validate people count minimum", async () => {
      // Set people count to 0
      await createPlanPage.setPeopleCount(0);

      await createPlanPage.fillDestination("Test City");
      await createPlanPage.selectStartDate(TEST_DATES.SHORT_TRIP_START);
      await createPlanPage.selectEndDate(TEST_DATES.SHORT_TRIP_END);

      await createPlanPage.submit();

      // Verify error message
      await expect(createPlanPage.peopleCountError).toBeVisible();
    });

    test("should validate people count maximum", async () => {
      // Set people count to 21 (above max)
      await createPlanPage.setPeopleCount(21);

      await createPlanPage.fillDestination("Test City");
      await createPlanPage.selectStartDate(TEST_DATES.SHORT_TRIP_START);
      await createPlanPage.selectEndDate(TEST_DATES.SHORT_TRIP_END);

      await createPlanPage.submit();

      // Verify error message
      await expect(createPlanPage.peopleCountError).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test.beforeEach(async ({ page }) => {
      // Clean up before starting
      await dbHelper.cleanupUserPreferences();
      await dbHelper.cleanupTravelPlans();

      // Login
      const testEmail = process.env.E2E_USERNAME;
      const testPassword = process.env.E2E_PASSWORD;

      if (!testEmail || !testPassword) {
        throw new Error("E2E_USERNAME and E2E_PASSWORD must be set in .env.test");
      }

      await loginPage.navigate();
      await loginPage.login(testEmail, testPassword);
      await expect(userMenu.trigger).toBeVisible();

      // Complete onboarding preferences
      await preferencesPage.navigate();
      await preferencesPage.fillAndSubmit({
        peopleCount: 2,
        tripType: "leisure",
        age: 30,
        country: "United States",
        comfort: "balanced",
        budget: "moderate",
      });

      // Wait for redirect to new plan page
      await page.waitForURL("/plans/new", { timeout: 10000 });
    });

    test("should have proper ARIA labels on form", async () => {
      // Verify form has aria-label
      await expect(createPlanPage.form).toHaveAttribute("aria-label", /create travel plan/i);
    });

    test("should have accessible date picker buttons", async () => {
      // Date picker buttons should have readable text
      await expect(createPlanPage.dateStartButton).toBeVisible();
      await expect(createPlanPage.dateEndButton).toBeVisible();
    });

    test.skip("should support keyboard navigation", async ({ page }) => {
      // Tab to first input (destination)
      await page.keyboard.press("Tab");
      await expect(createPlanPage.destinationInput).toBeFocused();

      // Type destination
      await page.keyboard.type("Paris");
      await expect(createPlanPage.destinationInput).toHaveValue("Paris");
    });
  });
});
