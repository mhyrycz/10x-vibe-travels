/**
 * Type Definitions for Plan Details View
 *
 * ViewModels transform API DTOs into UI-optimized structures with formatted
 * strings, computed properties, and denormalized data for efficient rendering.
 */

import type { TripTypeEnum, ComfortLevelEnum, BudgetLevelEnum, TransportModeEnum } from "../../types";

/**
 * ViewModel for the entire plan details view
 * Transforms PlanDto into UI-ready format with formatted dates and computed properties
 */
export interface PlanDetailsViewModel {
  id: string;
  name: string;
  destination: string;
  dateStart: string; // ISO date
  dateEnd: string; // ISO date
  formattedDateRange: string; // e.g., "June 15 – June 20, 2025"
  peopleCount: number;
  tripType: TripTypeEnum;
  comfort: ComfortLevelEnum;
  budget: BudgetLevelEnum;
  transportModes: TransportModeEnum[];
  noteText: string | null;
  hasWarnings: boolean; // true if any day has warning !== null
  days: DayViewModel[];
}

/**
 * ViewModel for a single day with activities and computed warnings
 */
export interface DayViewModel {
  id: string;
  dayIndex: number; // 1-based
  dayDate: string; // ISO date
  formattedDate: string; // e.g., "Monday, June 15, 2025"
  totalDurationMinutes: number;
  formattedDuration: string; // e.g., "8h 30min"
  warning: string | null;
  hasWarning: boolean; // computed from warning !== null
  activities: ActivityViewModel[];
}

/**
 * ViewModel for a single activity
 */
export interface ActivityViewModel {
  id: string;
  dayId: string; // Reference to parent day
  title: string;
  durationMinutes: number;
  formattedDuration: string; // e.g., "2h" or "45min"
  transportMinutes: number;
  formattedTransport: string | null; // e.g., "15min" or null if 0
  hasTransport: boolean; // computed from transportMinutes > 0
  orderIndex: number;
}
