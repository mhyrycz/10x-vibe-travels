/**
 * E2E Tests for User Authentication - Login Flow
 *
 * Tests the complete user sign-in scenario including:
 * - Successful login
 * - Invalid credentials
 * - Form validation
 * - Navigation after login
 * - Logout functionality
 *
 * Following Playwright best practices:
 * - Page Object Model for maintainability
 * - Resilient locators with data-testid
 * - Browser context isolation
 * - Specific matchers for assertions
 */

import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { UserMenuComponent } from "../components/UserMenuComponent";

// Test setup and teardown
test.describe("User Authentication - Login Flow", () => {
  let loginPage: LoginPage;
  let userMenu: UserMenuComponent;

  test.beforeEach(async ({ page }) => {
    // Initialize page objects
    loginPage = new LoginPage(page);
    userMenu = new UserMenuComponent(page);

    // Navigate to login page before each test
    await loginPage.navigate();
  });

  test.describe("Page Load and UI Elements", () => {
    test("should display login form with all required elements", async () => {
      // Verify heading
      await expect(loginPage.heading).toBeVisible();
      await expect(loginPage.heading).toHaveText("Log In");

      // Verify form container
      await expect(loginPage.formContainer).toBeVisible();
      await expect(loginPage.form).toBeVisible();

      // Verify input fields
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.emailInput).toHaveAttribute("type", "email");
      await expect(loginPage.emailInput).toHaveAttribute("placeholder", "your.email@example.com");

      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.passwordInput).toHaveAttribute("type", "password");
      await expect(loginPage.passwordInput).toHaveAttribute("placeholder", "Enter your password");

      // Verify submit button
      await expect(loginPage.submitButton).toBeVisible();
      await expect(loginPage.submitButton).toHaveText("Log In");
      await expect(loginPage.submitButton).toBeEnabled();

      // Verify links
      await expect(loginPage.forgotPasswordLink).toBeVisible();
      await expect(loginPage.forgotPasswordLink).toHaveText("Forgot password?");

      await expect(loginPage.registerLink).toBeVisible();
      await expect(loginPage.registerLink).toHaveText("Sign up");
    });

    test("should have correct navigation links", async () => {
      await expect(loginPage.forgotPasswordLink).toHaveAttribute("href", "/password-reset");
      await expect(loginPage.registerLink).toHaveAttribute("href", "/register");
    });
  });

  test.describe("Form Validation", () => {
    test("should show validation errors for empty fields", async () => {
      // Try to submit empty form
      await loginPage.submit();

      // Verify validation errors appear
      await expect(loginPage.emailError).toBeVisible();
      await expect(loginPage.emailError).toHaveText("Email is required");

      await expect(loginPage.passwordError).toBeVisible();
      await expect(loginPage.passwordError).toHaveText("Password is required");
    });

    test("should validate email format", async () => {
      // Enter invalid email
      await loginPage.fillEmail("invalid-email");
      await loginPage.fillPassword("ValidPassword123!");
      await loginPage.submit();

      // Verify email validation error
      await expect(loginPage.emailError).toBeVisible();
      await expect(loginPage.emailError).toHaveText("Please enter a valid email address");
    });

    test("should clear validation errors on input change", async () => {
      // Trigger validation errors
      await loginPage.submit();
      await expect(loginPage.emailError).toBeVisible();

      // Start typing in email field
      await loginPage.fillEmail("test@example.com");

      // Error should disappear
      await expect(loginPage.emailError).not.toBeVisible();
    });

    test("should disable submit button during submission", async () => {
      // Fill valid credentials (assuming this will trigger API call)
      await loginPage.fillEmail("test@example.com");
      await loginPage.fillPassword("password123");

      // Click submit
      await loginPage.submit();

      // Button should show loading state
      await expect(loginPage.submitButton).toContainText("Logging in...");
    });
  });

  test.describe("Authentication Flow", () => {
    test("should show error message for invalid credentials", async () => {
      // Attempt login with invalid credentials
      await loginPage.login("invalid@example.com", "wrongpassword");

      // Wait for error alert to appear
      await expect(loginPage.errorAlert).toBeVisible();
      await expect(loginPage.errorMessage).toBeVisible();

      // Error message should indicate invalid credentials
      await expect(loginPage.errorMessage).toContainText(/invalid/i);
    });

    test("should successfully login with valid credentials", async () => {
      // Note: This test requires a test user to be set up
      // You'll need to create a test user in your database or use API testing

      const testEmail = process.env.E2E_USERNAME || "test@example.com";
      const testPassword = process.env.E2E_PASSWORD || "TestPassword123!";

      // Perform login
      await loginPage.login(testEmail, testPassword);

      // User menu should be visible (indicates successful authentication)
      await expect(userMenu.trigger).toBeVisible();
    });

    test("should maintain session after login", async ({ page }) => {
      // Note: Requires valid test credentials
      const testEmail = process.env.E2E_USERNAME || "test@example.com";
      const testPassword = process.env.E2E_PASSWORD || "TestPassword123!";

      // Login
      await loginPage.login(testEmail, testPassword);

      // User menu should be visible (indicates successful authentication)
      await expect(userMenu.trigger).toBeVisible();

      // Should not redirect to login
      await expect(page).toHaveURL("/onboarding/preferences");
      await expect(userMenu.trigger).toBeVisible();
    });
  });

  test.describe("User Menu and Logout", () => {
    test("should open user menu and display all options", async () => {
      const testEmail = process.env.E2E_USERNAME || "test@example.com";
      const testPassword = process.env.E2E_PASSWORD || "TestPassword123!";

      // Login first
      await loginPage.login(testEmail, testPassword);

      // User menu should be visible (indicates successful authentication)
      await expect(userMenu.trigger).toBeVisible();

      // Open user menu
      await userMenu.open();

      // Verify all menu items are visible
      await expect(userMenu.dropdown).toBeVisible();
      await expect(userMenu.myPlansLink).toBeVisible();
      await expect(userMenu.preferencesLink).toBeVisible();
      await expect(userMenu.settingsLink).toBeVisible();
      await expect(userMenu.logoutButton).toBeVisible();
    });

    test("should successfully logout user", async ({ page }) => {
      // Note: Requires authenticated session
      const testEmail = process.env.E2E_USERNAME || "test@example.com";
      const testPassword = process.env.E2E_PASSWORD || "TestPassword123!";

      // Login first
      await loginPage.login(testEmail, testPassword);

      // User menu should be visible (indicates successful authentication)
      await expect(userMenu.trigger).toBeVisible();

      // Logout
      await userMenu.logout();

      // Should redirect to login page
      await expect(page).toHaveURL("/login");

      // User menu should not be visible
      await expect(userMenu.trigger).not.toBeVisible();

      // Login form should be visible
      await expect(loginPage.formContainer).toBeVisible();
    });
  });

  test.describe("Navigation", () => {
    test("should navigate to password reset page", async ({ page }) => {
      await loginPage.forgotPasswordLink.click();
      await expect(page).toHaveURL("/password-reset");
    });

    test("should navigate to registration page", async ({ page }) => {
      await loginPage.registerLink.click();
      await expect(page).toHaveURL("/register");
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper ARIA attributes", async () => {
      // Check email input
      await expect(loginPage.emailInput).toHaveAttribute("aria-invalid", "false");

      // Trigger validation
      await loginPage.submit();

      // Inputs with errors should have aria-invalid
      await expect(loginPage.emailInput).toHaveAttribute("aria-invalid", "true");
      await expect(loginPage.passwordInput).toHaveAttribute("aria-invalid", "true");
    });
  });
});
