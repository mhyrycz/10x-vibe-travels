/**
 * Edit Preferences Container Component
 * Orchestrates data fetching, loading states, error handling, and form rendering
 * Main logic component for the Edit Preferences view
 */

import { useUserPreferences } from "./hooks/useUserPreferences";
import PageHeader from "./PageHeader";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";
import EditPreferencesForm from "./EditPreferencesForm";

export default function EditPreferencesContainer() {
  const { data, isLoading, isError, error, refetch } = useUserPreferences();

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-2xl">
        <PageHeader />

        {/* Loading State */}
        {isLoading && <LoadingState />}

        {/* Error State */}
        {isError && error && <ErrorState error={error} onRetry={() => refetch()} />}

        {/* Form State */}
        {data && !isError && (
          <div className="bg-card border rounded-lg p-4 sm:p-6 shadow-sm">
            <EditPreferencesForm initialData={data} />
          </div>
        )}
      </main>
    </div>
  );
}
