/**
 * Page Object Model for Login Page
 * Encapsulates all login page interactions and locators
 */

import { type Page, type Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;

  // Locators using data-testid for resilient element selection
  readonly formContainer: Locator;
  readonly heading: Locator;
  readonly form: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly errorMessage: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators
    this.formContainer = page.getByTestId("login-form-container");
    this.heading = page.getByTestId("login-heading");
    this.form = page.getByTestId("login-form");
    this.emailInput = page.getByTestId("login-email-input");
    this.passwordInput = page.getByTestId("login-password-input");
    this.submitButton = page.getByTestId("login-submit-button");
    this.errorAlert = page.getByTestId("login-error-alert");
    this.errorMessage = page.getByTestId("login-error-message");
    this.emailError = page.getByTestId("login-email-error");
    this.passwordError = page.getByTestId("login-password-error");
    this.forgotPasswordLink = page.getByTestId("login-forgot-password-link");
    this.registerLink = page.getByTestId("login-register-link");
  }

  // Actions
  async navigate() {
    await this.page.goto("/login");
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }
}
