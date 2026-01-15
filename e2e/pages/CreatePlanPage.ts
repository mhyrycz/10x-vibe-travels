/**
 * Page Object Model for Create Plan Page
 * Encapsulates all create plan form interactions and locators
 */

import { type Page, type Locator } from "@playwright/test";

export class CreatePlanPage {
  readonly page: Page;

  // Header locators
  readonly header: Locator;
  readonly breadcrumb: Locator;
  readonly heading: Locator;

  // Form container locators
  readonly card: Locator;
  readonly cardTitle: Locator;
  readonly form: Locator;

  // Destination section locators
  readonly destinationField: Locator;
  readonly destinationInput: Locator;
  readonly destinationError: Locator;

  // Date range section locators
  readonly dateRangeSection: Locator;
  readonly dateStartField: Locator;
  readonly dateStartButton: Locator;
  readonly dateStartCalendar: Locator;
  readonly dateStartError: Locator;
  readonly dateEndField: Locator;
  readonly dateEndButton: Locator;
  readonly dateEndCalendar: Locator;
  readonly dateEndError: Locator;

  // Preferences section locators
  readonly preferencesSection: Locator;
  readonly peopleCountField: Locator;
  readonly peopleCountInput: Locator;
  readonly peopleCountError: Locator;
  readonly tripTypeField: Locator;
  readonly tripTypeSelect: Locator;
  readonly tripTypeLeisure: Locator;
  readonly tripTypeBusiness: Locator;
  readonly tripTypeError: Locator;
  readonly comfortField: Locator;
  readonly comfortSelect: Locator;
  readonly comfortRelax: Locator;
  readonly comfortBalanced: Locator;
  readonly comfortIntense: Locator;
  readonly comfortError: Locator;
  readonly budgetField: Locator;
  readonly budgetSelect: Locator;
  readonly budgetBudget: Locator;
  readonly budgetModerate: Locator;
  readonly budgetLuxury: Locator;
  readonly budgetError: Locator;

  // Transport section locators
  readonly transportSection: Locator;
  readonly transportCarField: Locator;
  readonly transportCarCheckbox: Locator;
  readonly transportWalkField: Locator;
  readonly transportWalkCheckbox: Locator;
  readonly transportPublicField: Locator;
  readonly transportPublicCheckbox: Locator;
  readonly transportError: Locator;

  // Travel note section locators
  readonly travelNoteField: Locator;
  readonly travelNoteTextarea: Locator;
  readonly travelNoteCounter: Locator;
  readonly travelNoteError: Locator;

  // Action locators
  readonly formActions: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize header locators
    this.header = page.getByTestId("create-plan-header");
    this.breadcrumb = page.getByTestId("create-plan-breadcrumb");
    this.heading = page.getByTestId("create-plan-heading");

    // Initialize form container locators
    this.card = page.getByTestId("create-plan-card");
    this.cardTitle = page.getByTestId("create-plan-card-title");
    this.form = page.getByTestId("create-plan-form");

    // Initialize destination locators
    this.destinationField = page.getByTestId("destination-field");
    this.destinationInput = page.getByTestId("destination-input");
    this.destinationError = page.getByTestId("destination-error");

    // Initialize date range locators
    this.dateRangeSection = page.getByTestId("date-range-section");
    this.dateStartField = page.getByTestId("date_start-field");
    this.dateStartButton = page.getByTestId("date_start-button");
    this.dateStartCalendar = page.getByTestId("date_start-calendar");
    this.dateStartError = page.getByTestId("date_start-error");
    this.dateEndField = page.getByTestId("date_end-field");
    this.dateEndButton = page.getByTestId("date_end-button");
    this.dateEndCalendar = page.getByTestId("date_end-calendar");
    this.dateEndError = page.getByTestId("date_end-error");

    // Initialize preferences locators
    this.preferencesSection = page.getByTestId("preferences-section");
    this.peopleCountField = page.getByTestId("people-count-field");
    this.peopleCountInput = page.getByTestId("people-count-input");
    this.peopleCountError = page.getByTestId("people-count-error");
    this.tripTypeField = page.getByTestId("trip-type-field");
    this.tripTypeSelect = page.getByTestId("trip-type-select");
    this.tripTypeLeisure = page.getByTestId("trip-type-leisure");
    this.tripTypeBusiness = page.getByTestId("trip-type-business");
    this.tripTypeError = page.getByTestId("trip-type-error");
    this.comfortField = page.getByTestId("comfort-field");
    this.comfortSelect = page.getByTestId("comfort-select");
    this.comfortRelax = page.getByTestId("comfort-relax");
    this.comfortBalanced = page.getByTestId("comfort-balanced");
    this.comfortIntense = page.getByTestId("comfort-intense");
    this.comfortError = page.getByTestId("comfort-error");
    this.budgetField = page.getByTestId("budget-field");
    this.budgetSelect = page.getByTestId("budget-select");
    this.budgetBudget = page.getByTestId("budget-budget");
    this.budgetModerate = page.getByTestId("budget-moderate");
    this.budgetLuxury = page.getByTestId("budget-luxury");
    this.budgetError = page.getByTestId("budget-error");

    // Initialize transport locators
    this.transportSection = page.getByTestId("transport-section");
    this.transportCarField = page.getByTestId("transport-car-field");
    this.transportCarCheckbox = page.getByTestId("transport-car-checkbox");
    this.transportWalkField = page.getByTestId("transport-walk-field");
    this.transportWalkCheckbox = page.getByTestId("transport-walk-checkbox");
    this.transportPublicField = page.getByTestId("transport-public-field");
    this.transportPublicCheckbox = page.getByTestId("transport-public-checkbox");
    this.transportError = page.getByTestId("transport-error");

    // Initialize travel note locators
    this.travelNoteField = page.getByTestId("travel-note-field");
    this.travelNoteTextarea = page.getByTestId("travel-note-textarea");
    this.travelNoteCounter = page.getByTestId("travel-note-counter");
    this.travelNoteError = page.getByTestId("travel-note-error");

    // Initialize action locators
    this.formActions = page.getByTestId("form-actions");
    this.submitButton = page.getByTestId("create-plan-submit-button");
    this.cancelButton = page.getByTestId("create-plan-cancel-button");
  }

  // Navigation actions
  async navigate() {
    await this.page.goto("/plans/new");
  }

  // Destination actions
  async fillDestination(destination: string) {
    await this.destinationInput.fill(destination);
  }

  // Date actions
  async selectStartDate(date: Date) {
    // 1. Open start date calendar
    await this.dateStartButton.click();

    // 2. Wait for calendar to be visible using data-testid
    await this.dateStartCalendar.waitFor({ state: "visible", timeout: 5000 });

    // 3. Navigate to the correct month if needed
    // Keep clicking next month button until we find the target date
    let attempts = 0;
    const maxAttempts = 24; // Allow navigation up to 2 years ahead

    while (attempts < maxAttempts) {
      // Check if target date button is visible
      // Note: data-day uses toLocaleDateString() which produces "M/D/YYYY" format (e.g., "6/15/2026")
      const month = date.getMonth() + 1; // 1-indexed month
      const day = date.getDate();
      const year = date.getFullYear();
      const dataDay = `${month}/${day}/${year}`;

      const dayButton = this.page.locator(`button[data-day="${dataDay}"]`);

      // Check if the button is visible (meaning we're on the correct month)
      const isVisible = await dayButton.isVisible().catch(() => false);

      if (isVisible) {
        // 4. Click the day button
        await dayButton.click();
        break;
      }

      // Navigate to next month
      const nextButton = this.page.getByTestId("calendar-next-button");
      await nextButton.click();
      await this.page.waitForTimeout(300); // Wait for calendar to update
      attempts++;
    }

    // 5 & 6. Calendar should close automatically - verify it's closed
    await this.dateStartCalendar.waitFor({ state: "hidden", timeout: 5000 });
  }

  async selectEndDate(date: Date) {
    // 1. Open end date calendar
    await this.dateEndButton.click();

    // 2. Wait for calendar to be visible using data-testid
    await this.dateEndCalendar.waitFor({ state: "visible", timeout: 5000 });

    // 3. Navigate to the correct month if needed
    // Keep clicking next month button until we find the target date
    let attempts = 0;
    const maxAttempts = 24; // Allow navigation up to 2 years ahead

    while (attempts < maxAttempts) {
      // Check if target date button is visible
      // Note: data-day uses toLocaleDateString() which produces "M/D/YYYY" format (e.g., "6/15/2026")
      const month = date.getMonth() + 1; // 1-indexed month
      const day = date.getDate();
      const year = date.getFullYear();
      const dataDay = `${month}/${day}/${year}`;

      const dayButton = this.page.locator(`button[data-day="${dataDay}"]`);

      // Check if the button is visible (meaning we're on the correct month)
      const isVisible = await dayButton.isVisible().catch(() => false);

      if (isVisible) {
        // 4. Click the day button
        await dayButton.click();
        break;
      }

      // Navigate to next month
      const nextButton = this.page.getByTestId("calendar-next-button");
      await nextButton.click();
      await this.page.waitForTimeout(300); // Wait for calendar to update
      attempts++;
    }

    // 5 & 6. Calendar should close automatically - verify it's closed
    await this.dateEndCalendar.waitFor({ state: "hidden", timeout: 5000 });
  }

  // People count actions
  async setPeopleCount(count: number) {
    await this.peopleCountInput.fill(count.toString());
  }

  // Trip type actions
  async selectTripType(type: "leisure" | "business") {
    await this.tripTypeSelect.click();
    if (type === "leisure") {
      await this.tripTypeLeisure.click();
    } else {
      await this.tripTypeBusiness.click();
    }
  }

  // Comfort actions
  async selectComfort(comfort: "relax" | "balanced" | "intense") {
    await this.comfortSelect.click();
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
    await this.budgetSelect.click();
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

  // Transport actions
  async selectTransport(modes: ("car" | "walk" | "public")[]) {
    for (const mode of modes) {
      switch (mode) {
        case "car":
          await this.transportCarCheckbox.check();
          break;
        case "walk":
          await this.transportWalkCheckbox.check();
          break;
        case "public":
          await this.transportPublicCheckbox.check();
          break;
      }
    }
  }

  // Travel note actions
  async fillTravelNote(note: string) {
    await this.travelNoteTextarea.fill(note);
  }

  // Form submission
  async submit() {
    await this.submitButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  // Complete form with all values
  async fillCompleteForm(planData: {
    destination: string;
    dateStart: Date;
    dateEnd: Date;
    peopleCount?: number;
    tripType?: "leisure" | "business";
    comfort?: "relax" | "balanced" | "intense";
    budget?: "budget" | "moderate" | "luxury";
    transport?: ("car" | "walk" | "public")[];
    travelNote?: string;
  }) {
    await this.fillDestination(planData.destination);
    await this.selectStartDate(planData.dateStart);
    await this.selectEndDate(planData.dateEnd);

    if (planData.peopleCount !== undefined) {
      await this.setPeopleCount(planData.peopleCount);
    }

    if (planData.tripType) {
      await this.selectTripType(planData.tripType);
    }

    if (planData.comfort) {
      await this.selectComfort(planData.comfort);
    }

    if (planData.budget) {
      await this.selectBudget(planData.budget);
    }

    if (planData.transport && planData.transport.length > 0) {
      await this.selectTransport(planData.transport);
    }

    if (planData.travelNote) {
      await this.fillTravelNote(planData.travelNote);
    }
  }

  // Submit complete form
  async fillAndSubmit(planData: {
    destination: string;
    dateStart: Date;
    dateEnd: Date;
    peopleCount?: number;
    tripType?: "leisure" | "business";
    comfort?: "relax" | "balanced" | "intense";
    budget?: "budget" | "moderate" | "luxury";
    transport?: ("car" | "walk" | "public")[];
    travelNote?: string;
  }) {
    await this.fillCompleteForm(planData);
    await this.submit();
  }
}
