/**
 * View Model Types for My Plans Page
 *
 * These types represent the transformed data structures
 * optimized for UI rendering, derived from API DTOs.
 */

/**
 * View model for a single plan card
 * Transformed from PlanListItemDto for UI consumption
 */
export interface PlanCardViewModel {
  id: string;
  name: string;
  destination: string;
  formattedDate: string; // e.g., "Created on Dec 22, 2025"
  href: string; // e.g., "/plans/uuid-goes-here"
}

/**
 * Complete view model for MyPlansView component
 * Represents all state needed by the view
 */
export interface MyPlansViewModel {
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  plans: PlanCardViewModel[];
  totalPlans: number;
  planLimit: number;
}
