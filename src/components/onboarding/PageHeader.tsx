/**
 * PageHeader component for preferences onboarding
 * Displays welcoming message and instructions for completing profile
 */

import React from "react";

/**
 * Header for the preferences onboarding page
 * Provides context about why preferences are needed
 */
export default function PageHeader() {
  return (
    <header className="mb-6 sm:mb-8" data-testid="preferences-header">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="preferences-heading">
        Welcome to VibeTravels!
      </h1>
      <p
        className="text-muted-foreground mt-2 text-base sm:text-lg leading-relaxed"
        data-testid="preferences-description"
      >
        Complete your travel preferences to get started with personalized plans
      </p>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed" data-testid="preferences-help-text">
        This helps our AI create travel plans tailored to your style and budget
      </p>
    </header>
  );
}
