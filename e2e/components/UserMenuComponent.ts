/**
 * Page Object Model for User Menu Component
 * Encapsulates authenticated user navigation
 */

import { type Page, type Locator } from "@playwright/test";

export class UserMenuComponent {
  readonly page: Page;

  // Locators using data-testid for resilient element selection
  readonly trigger: Locator;
  readonly dropdown: Locator;
  readonly myPlansLink: Locator;
  readonly preferencesLink: Locator;
  readonly settingsLink: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators
    this.trigger = page.getByTestId("user-menu-trigger");
    this.dropdown = page.getByTestId("user-menu-dropdown");
    this.myPlansLink = page.getByTestId("user-menu-my-plans");
    this.preferencesLink = page.getByTestId("user-menu-preferences");
    this.settingsLink = page.getByTestId("user-menu-settings");
    this.logoutButton = page.getByTestId("user-menu-logout");
  }

  // Actions
  async open() {
    await this.trigger.click();
  }

  async logout() {
    await this.open();
    await this.logoutButton.click();
  }
}
