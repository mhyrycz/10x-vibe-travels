/**
 * Main view component for user preferences onboarding
 * Provides QueryClient context for this Astro island.
 */

import React from "react";
import { QueryClientProvider } from "../QueryClientProvider";
import PageHeader from "./PageHeader";
import PreferencesForm from "./PreferencesForm";

/**
 * Main preferences onboarding view component
 */
export default function PreferencesOnboardingView() {
  return (
    <QueryClientProvider>
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-2xl">
          <PageHeader />
          <div className="bg-card border rounded-lg p-4 sm:p-6 shadow-sm">
            <PreferencesForm />
          </div>
        </main>
      </div>
    </QueryClientProvider>
  );
}
