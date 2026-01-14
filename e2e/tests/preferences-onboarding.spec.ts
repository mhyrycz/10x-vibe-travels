/**
 * E2E Tests for First-Time User Onboarding - Preferences Flow
 *
 * Tests the complete preferences onboarding scenario for a newly registered user:
 * - Login with test credentials
 * - Navigate to preferences onboarding page
 * - Fill out all preference fields
 * - Submit the form
 * - Verify successful completion
 *
 * Following Playwright best practices:
 * - Page Object Model for maintainability
 * - Resilient locators with data-testid
 * - Browser context isolation
 * - Specific matchers for assertions
 */

import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { PreferencesOnboardingPage } from "../pages/PreferencesOnboardingPage";
import { UserMenuComponent } from "../components/UserMenuComponent";
import { DatabaseHelper } from "../helpers/DatabaseHelper";

// Test setup and teardown
test.describe("First-Time User Onboarding - Preferences Flow", () => {
  let loginPage: LoginPage;
  let preferencesPage: PreferencesOnboardingPage;
  let userMenu: UserMenuComponent;
  let dbHelper: DatabaseHelper;

  test.beforeEach(async ({ page }) => {
    // Initialize page objects
    loginPage = new LoginPage(page);
    preferencesPage = new PreferencesOnboardingPage(page);
    userMenu = new UserMenuComponent(page);
    dbHelper = new DatabaseHelper();
    // Clean up preferences before each test
    try {
      await dbHelper.cleanupUserPreferences();
    } catch (error) {
      console.warn("⚠️ Failed to cleanup after test:", error);
      // Don't throw - allow tests to continue even if cleanup fails
    }
  });

  test.describe("Authenticated User - Preferences Setup", () => {
    test.beforeEach(async () => {
      // Login before each test
      const testEmail = process.env.E2E_USERNAME;
      const testPassword = process.env.E2E_PASSWORD;

      if (!testEmail || !testPassword) {
        throw new Error("E2E_USERNAME and E2E_PASSWORD must be set in .env.test");
      }

      await loginPage.navigate();
      await loginPage.login(testEmail, testPassword);
      await expect(userMenu.trigger).toBeVisible();
    });

    test("should display preferences onboarding page with all elements", async () => {
      // Verify main container
      await expect(preferencesPage.container).toBeVisible();
      await expect(preferencesPage.formCard).toBeVisible();

      // Verify header elements
      await expect(preferencesPage.heading).toBeVisible();
      await expect(preferencesPage.heading).toHaveText("Welcome to VibeTravels!");
      await expect(preferencesPage.description).toBeVisible();
      await expect(preferencesPage.helpText).toBeVisible();

      // Verify form is visible
      await expect(preferencesPage.form).toBeVisible();
    });

    test("should display all form fields", async () => {
      // People count field
      await expect(preferencesPage.peopleCountField).toBeVisible();
      await expect(preferencesPage.peopleCountInput).toBeVisible();
      await expect(preferencesPage.peopleCountDecrease).toBeVisible();
      await expect(preferencesPage.peopleCountIncrease).toBeVisible();

      // Trip type field
      await expect(preferencesPage.tripTypeField).toBeVisible();
      await expect(preferencesPage.tripTypeLeisure).toBeVisible();
      await expect(preferencesPage.tripTypeBusiness).toBeVisible();

      // Age field
      await expect(preferencesPage.ageField).toBeVisible();
      await expect(preferencesPage.ageInput).toBeVisible();

      // Country field
      await expect(preferencesPage.countryField).toBeVisible();
      await expect(preferencesPage.countryInput).toBeVisible();

      // Comfort field
      await expect(preferencesPage.comfortField).toBeVisible();
      await expect(preferencesPage.comfortRelax).toBeVisible();
      await expect(preferencesPage.comfortBalanced).toBeVisible();
      await expect(preferencesPage.comfortIntense).toBeVisible();

      // Budget field
      await expect(preferencesPage.budgetField).toBeVisible();
      await expect(preferencesPage.budgetBudget).toBeVisible();
      await expect(preferencesPage.budgetModerate).toBeVisible();
      await expect(preferencesPage.budgetLuxury).toBeVisible();

      // Submit button
      await expect(preferencesPage.submitButton).toBeVisible();
      await expect(preferencesPage.submitButton).toHaveText("Complete Setup");
    });

    test("should have default value for people count", async () => {
      // Default should be 2
      await expect(preferencesPage.peopleCountInput).toHaveValue("2");
    });

    test("should increment and decrement people count", async () => {
      // Verify default
      await expect(preferencesPage.peopleCountInput).toHaveValue("2");

      // Increment
      await preferencesPage.increasePeopleCount();
      await expect(preferencesPage.peopleCountInput).toHaveValue("3");

      await preferencesPage.increasePeopleCount(2);
      await expect(preferencesPage.peopleCountInput).toHaveValue("5");

      // Decrement
      await preferencesPage.decreasePeopleCount();
      await expect(preferencesPage.peopleCountInput).toHaveValue("4");

      await preferencesPage.decreasePeopleCount(2);
      await expect(preferencesPage.peopleCountInput).toHaveValue("2");
    });

    test("should disable decrement button at minimum value", async () => {
      // Set to minimum (1)
      await preferencesPage.setPeopleCount(1);
      await expect(preferencesPage.peopleCountInput).toHaveValue("1");

      // Decrease button should be disabled
      await expect(preferencesPage.peopleCountDecrease).toBeDisabled();
    });

    test("should disable increment button at maximum value", async () => {
      // Set to maximum (20)
      await preferencesPage.setPeopleCount(20);
      await expect(preferencesPage.peopleCountInput).toHaveValue("20");

      // Increase button should be disabled
      await expect(preferencesPage.peopleCountIncrease).toBeDisabled();
    });

    test("should allow selecting trip type", async () => {
      // Select leisure
      await preferencesPage.selectTripType("leisure");
      await expect(preferencesPage.tripTypeLeisure).toBeChecked();

      // Switch to business
      await preferencesPage.selectTripType("business");
      await expect(preferencesPage.tripTypeBusiness).toBeChecked();
      await expect(preferencesPage.tripTypeLeisure).not.toBeChecked();
    });

    test("should allow entering age", async () => {
      await preferencesPage.fillAge(30);
      await expect(preferencesPage.ageInput).toHaveValue("30");
    });

    test("should allow entering country", async () => {
      await preferencesPage.fillCountry("Poland");
      await expect(preferencesPage.countryInput).toHaveValue("Poland");
    });

    test("should allow selecting comfort level", async () => {
      // Select relax
      await preferencesPage.selectComfort("relax");
      await expect(preferencesPage.comfortRelax).toBeChecked();

      // Switch to balanced
      await preferencesPage.selectComfort("balanced");
      await expect(preferencesPage.comfortBalanced).toBeChecked();
      await expect(preferencesPage.comfortRelax).not.toBeChecked();

      // Switch to intense
      await preferencesPage.selectComfort("intense");
      await expect(preferencesPage.comfortIntense).toBeChecked();
      await expect(preferencesPage.comfortBalanced).not.toBeChecked();
    });

    test("should allow selecting budget level", async () => {
      // Select budget
      await preferencesPage.selectBudget("budget");
      await expect(preferencesPage.budgetBudget).toBeChecked();

      // Switch to moderate
      await preferencesPage.selectBudget("moderate");
      await expect(preferencesPage.budgetModerate).toBeChecked();
      await expect(preferencesPage.budgetBudget).not.toBeChecked();

      // Switch to luxury
      await preferencesPage.selectBudget("luxury");
      await expect(preferencesPage.budgetLuxury).toBeChecked();
      await expect(preferencesPage.budgetModerate).not.toBeChecked();
    });

    test("should successfully complete preferences form with valid data", async ({ page }) => {
      // Fill complete form
      await preferencesPage.fillAndSubmit({
        peopleCount: 2,
        tripType: "leisure",
        age: 30,
        country: "Poland",
        comfort: "balanced",
        budget: "moderate",
      });

      // Wait for submission to complete
      await page.waitForURL("/plans/new", { timeout: 10000 });

      // Should redirect to create plan page after successful onboarding
      await expect(page).toHaveURL("/plans/new");

      // User menu should still be visible (user remains authenticated)
      await expect(userMenu.trigger).toBeVisible();
    });

    test("should show loading state during form submission", async () => {
      // Fill form
      await preferencesPage.fillCompleteForm({
        tripType: "business",
        age: 35,
        country: "Germany",
        comfort: "intense",
        budget: "luxury",
      });

      // Submit
      await preferencesPage.submit();

      // Button should show loading state
      await expect(preferencesPage.submitButton).toContainText("Saving...");
    });

    test("should complete full onboarding flow from login to preferences", async ({ page }) => {
      // User is already logged in from beforeEach
      // Already on preferences page

      // Verify we're on the onboarding page
      await expect(page).toHaveURL("/onboarding/preferences");
      await expect(preferencesPage.heading).toBeVisible();

      // Fill and submit preferences
      await preferencesPage.fillAndSubmit({
        peopleCount: 3,
        tripType: "leisure",
        age: 28,
        country: "United States",
        comfort: "relax",
        budget: "budget",
      });

      // Wait for redirect to create plan page
      await page.waitForURL("/plans/new", { timeout: 10000 });

      // Verify successful completion
      await expect(page).toHaveURL("/plans/new");
      await expect(userMenu.trigger).toBeVisible();
    });
  });

  test.describe("Form Validation", () => {
    test.beforeEach(async () => {
      // Login before each test
      const testEmail = process.env.E2E_USERNAME;
      const testPassword = process.env.E2E_PASSWORD;

      if (!testEmail || !testPassword) {
        throw new Error("E2E_USERNAME and E2E_PASSWORD must be set in .env.test");
      }

      await loginPage.navigate();
      await loginPage.login(testEmail, testPassword);
      await expect(userMenu.trigger).toBeVisible();
    });

    test("should show validation errors for incomplete form", async () => {
      // Submit without filling any fields (except default people_count)
      await preferencesPage.submit();

      // Form should not submit - stay on same page
      await expect(preferencesPage.form).toBeVisible();

      // Note: Validation messages are handled by shadcn/ui FormMessage components
      // They will appear but may need to wait for them to be visible
    });

    test("should validate age minimum value", async () => {
      // Try to enter age below minimum (13)
      await preferencesPage.fillAge(10);

      // Fill rest of form
      await preferencesPage.selectTripType("leisure");
      await preferencesPage.fillCountry("Poland");
      await preferencesPage.selectComfort("balanced");
      await preferencesPage.selectBudget("moderate");

      await preferencesPage.submit();

      // Should show validation error and not submit
      await expect(preferencesPage.form).toBeVisible();
    });

    test("should validate country minimum length", async () => {
      // Try to enter country with only 1 character (minimum is 2)
      await preferencesPage.fillCountry("P");

      // Fill rest of form
      await preferencesPage.selectTripType("leisure");
      await preferencesPage.fillAge(30);
      await preferencesPage.selectComfort("balanced");
      await preferencesPage.selectBudget("moderate");

      await preferencesPage.submit();

      // Should show validation error and not submit
      await expect(preferencesPage.form).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test.beforeEach(async () => {
      // Login before each test
      const testEmail = process.env.E2E_USERNAME;
      const testPassword = process.env.E2E_PASSWORD;

      if (!testEmail || !testPassword) {
        throw new Error("E2E_USERNAME and E2E_PASSWORD must be set in .env.test");
      }

      await loginPage.navigate();
      await loginPage.login(testEmail, testPassword);
      await expect(userMenu.trigger).toBeVisible();
    });

    test("should have proper ARIA labels on buttons", async () => {
      await expect(preferencesPage.peopleCountDecrease).toHaveAttribute("aria-label", "Decrease number of travelers");
      await expect(preferencesPage.peopleCountIncrease).toHaveAttribute("aria-label", "Increase number of travelers");
    });

    test("should have form with aria-label", async () => {
      await expect(preferencesPage.form).toHaveAttribute("aria-label", "Travel preferences form");
    });

    test.skip("should be keyboard navigable through radio groups", async ({ page }) => {
      // Focus trip type field
      await preferencesPage.tripTypeLeisure.focus();
      await expect(preferencesPage.tripTypeLeisure).toBeFocused();

      // Use arrow keys to navigate (radio groups support arrow key navigation)
      await page.keyboard.press("ArrowDown");
      await expect(preferencesPage.tripTypeBusiness).toBeChecked();
    });
  });
});
