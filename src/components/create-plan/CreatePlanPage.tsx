/**
 * CreatePlanPage Component
 *
 * Main view for the Create Plan page with QueryClient provider.
 * This is an Astro island that needs its own React Query context.
 */

import { QueryClientProvider } from "../QueryClientProvider";
import CreatePlanView from "./CreatePlanView";

export default function CreatePlanPage() {
  return (
    <QueryClientProvider>
      <CreatePlanView />
    </QueryClientProvider>
  );
}
