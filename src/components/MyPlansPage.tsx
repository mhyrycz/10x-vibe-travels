/**
 * MyPlansPage Component
 *
 * Main view for the My Plans page with QueryClient provider.
 * This is an Astro island that needs its own React Query context.
 */

import { QueryClientProvider } from "./QueryClientProvider";
import { MyPlansView } from "./MyPlansView";

export function MyPlansPage() {
  return (
    <QueryClientProvider>
      <MyPlansView />
    </QueryClientProvider>
  );
}
