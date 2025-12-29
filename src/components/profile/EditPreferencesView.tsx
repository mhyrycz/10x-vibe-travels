/**
 * Edit Preferences View - Main Component
 * Provides QueryClient context for this Astro island.
 */

import { QueryClientProvider } from "../QueryClientProvider";
import EditPreferencesContainer from "./EditPreferencesContainer";

/**
 * Main edit preferences view component
 */
export default function EditPreferencesView() {
  return (
    <QueryClientProvider>
      <EditPreferencesContainer />
    </QueryClientProvider>
  );
}
