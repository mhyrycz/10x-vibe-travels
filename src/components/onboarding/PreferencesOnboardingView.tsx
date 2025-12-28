/**
 * Main view component for user preferences onboarding
 * Manages the onboarding flow state, coordinates child components,
 * and handles the overall user experience including loading states,
 * error handling, and navigation.
 */

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PageHeader from "./PageHeader";
import PreferencesForm from "./PreferencesForm";

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * Main preferences onboarding view component
 */
export default function PreferencesOnboardingView() {
  return (
    <QueryClientProvider client={queryClient}>
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
