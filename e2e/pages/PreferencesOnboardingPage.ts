/**
 * Page Object Model for Preferences Onboarding Page
 * Encapsulates all preferences form interactions and locators
 */

import { type Page, type Locator } from "@playwright/test";

export class PreferencesOnboardingPage {
  readonly page: Page;

  // Container locators
  readonly container: Locator;
  readonly formCard: Locator;
  readonly form: Locator;

  // Header locators
  readonly header: Locator;
  readonly heading: Locator;
  readonly description: Locator;
  readonly helpText: Locator;

  // People count field locators
  readonly peopleCountField: Locator;
  readonly peopleCountInput: Locator;
  readonly peopleCountDecrease: Locator;
  readonly peopleCountIncrease: Locator;

  // Trip type field locators
  readonly tripTypeField: Locator;
  readonly tripTypeRadioGroup: Locator;
  readonly tripTypeLeisure: Locator;
  readonly tripTypeBusiness: Locator;

  // Age field locators
  readonly ageField: Locator;
  readonly ageInput: Locator;

  // Country field locators
  readonly countryField: Locator;
  readonly countryInput: Locator;

  // Comfort field locators
  readonly comfortField: Locator;
  readonly comfortRadioGroup: Locator;
  readonly comfortRelax: Locator;
  readonly comfortBalanced: Locator;
  readonly comfortIntense: Locator;

  // Budget field locators
  readonly budgetField: Locator;
  readonly budgetRadioGroup: Locator;
  readonly budgetBudget: Locator;
  readonly budgetModerate: Locator;
  readonly budgetLuxury: Locator;

  // Action locators
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize container locators
    this.container = page.getByTestId("preferences-onboarding-container");
    this.formCard = page.getByTestId("preferences-form-card");
    this.form = page.getByTestId("preferences-form");

    // Initialize header locators
    this.header = page.getByTestId("preferences-header");
    this.heading = page.getByTestId("preferences-heading");
    this.description = page.getByTestId("preferences-description");
    this.helpText = page.getByTestId("preferences-help-text");

    // Initialize people count locators
    this.peopleCountField = page.getByTestId("people-count-field");
    this.peopleCountInput = page.getByTestId("people-count-input");
    this.peopleCountDecrease = page.getByTestId("people-count-decrease");
    this.peopleCountIncrease = page.getByTestId("people-count-increase");

    // Initialize trip type locators
    this.tripTypeField = page.getByTestId("trip-type-field");
    this.tripTypeRadioGroup = page.getByTestId("trip-type-radio-group");
    this.tripTypeLeisure = page.getByTestId("trip-type-leisure");
    this.tripTypeBusiness = page.getByTestId("trip-type-business");

    // Initialize age locators
    this.ageField = page.getByTestId("age-field");
    this.ageInput = page.getByTestId("age-input");

    // Initialize country locators
    this.countryField = page.getByTestId("country-field");
    this.countryInput = page.getByTestId("country-input");

    // Initialize comfort locators
    this.comfortField = page.getByTestId("comfort-field");
    this.comfortRadioGroup = page.getByTestId("comfort-radio-group");
    this.comfortRelax = page.getByTestId("comfort-relax");
    this.comfortBalanced = page.getByTestId("comfort-balanced");
    this.comfortIntense = page.getByTestId("comfort-intense");

    // Initialize budget locators
    this.budgetField = page.getByTestId("budget-field");
    this.budgetRadioGroup = page.getByTestId("budget-radio-group");
    this.budgetBudget = page.getByTestId("budget-budget");
    this.budgetModerate = page.getByTestId("budget-moderate");
    this.budgetLuxury = page.getByTestId("budget-luxury");

    // Initialize action locators
    this.submitButton = page.getByTestId("preferences-submit-button");
  }

  // Navigation actions
  async navigate() {
    await this.page.goto("/onboarding/preferences");
  }

  // People count actions
  async setPeopleCount(count: number) {
    await this.peopleCountInput.fill(count.toString());
  }

  async increasePeopleCount(times = 1) {
    for (let i = 0; i < times; i++) {
      await this.peopleCountIncrease.click();
    }
  }

  async decreasePeopleCount(times = 1) {
    for (let i = 0; i < times; i++) {
      await this.peopleCountDecrease.click();
    }
  }

  // Trip type actions
  async selectTripType(type: "leisure" | "business") {
    if (type === "leisure") {
      await this.tripTypeLeisure.click();
    } else {
      await this.tripTypeBusiness.click();
    }
  }

  // Age actions
  async fillAge(age: number) {
    await this.ageInput.fill(age.toString());
  }

  // Country actions
  async fillCountry(country: string) {
    await this.countryInput.fill(country);
  }

  // Comfort actions
  async selectComfort(comfort: "relax" | "balanced" | "intense") {
    switch (comfort) {
      case "relax":
        await this.comfortRelax.click();
        break;
      case "balanced":
        await this.comfortBalanced.click();
        break;
      case "intense":
        await this.comfortIntense.click();
        break;
    }
  }

  // Budget actions
  async selectBudget(budget: "budget" | "moderate" | "luxury") {
    switch (budget) {
      case "budget":
        await this.budgetBudget.click();
        break;
      case "moderate":
        await this.budgetModerate.click();
        break;
      case "luxury":
        await this.budgetLuxury.click();
        break;
    }
  }

  // Form submission
  async submit() {
    await this.submitButton.click();
  }

  // Complete form with all values
  async fillCompleteForm(preferences: {
    peopleCount?: number;
    tripType: "leisure" | "business";
    age: number;
    country: string;
    comfort: "relax" | "balanced" | "intense";
    budget: "budget" | "moderate" | "luxury";
  }) {
    if (preferences.peopleCount !== undefined) {
      await this.setPeopleCount(preferences.peopleCount);
    }
    await this.selectTripType(preferences.tripType);
    await this.fillAge(preferences.age);
    await this.fillCountry(preferences.country);
    await this.selectComfort(preferences.comfort);
    await this.selectBudget(preferences.budget);
  }

  // Submit complete form
  async fillAndSubmit(preferences: {
    peopleCount?: number;
    tripType: "leisure" | "business";
    age: number;
    country: string;
    comfort: "relax" | "balanced" | "intense";
    budget: "budget" | "moderate" | "luxury";
  }) {
    await this.fillCompleteForm(preferences);
    await this.submit();
  }
}
