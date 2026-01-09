/**
 * Transformation utilities for Plan Details View
 *
 * Converts API DTOs to ViewModels with formatted strings and computed properties
 */

import { format } from "date-fns";
import type { PlanDto, ActivityDto } from "../../types";
import type { PlanDetailsViewModel, DayViewModel, ActivityViewModel } from "./types";

/**
 * Formats duration in minutes to human-readable string
 * @param minutes - Duration in minutes
 * @returns Formatted string like "2h", "45min", or "2h 15min"
 */
export function formatDuration(minutes: number): string {
  if (minutes === 0) return "0min";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}min`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}min`;
}

/**
 * Formats date range as a single string
 * @param start - ISO date string
 * @param end - ISO date string
 * @returns Formatted string like "June 15 – June 20, 2025"
 */
export function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const startFormatted = format(startDate, "MMMM d");
  const endFormatted = format(endDate, "MMMM d, yyyy");

  return `${startFormatted} – ${endFormatted}`;
}

/**
 * Transforms activity DTO to ViewModel
 */
function transformActivityToViewModel(activity: ActivityDto, dayId: string): ActivityViewModel {
  const formattedDuration = formatDuration(activity.duration_minutes);
  const transportMinutes = activity.transport_minutes ?? 0;
  const formattedTransport = transportMinutes > 0 ? formatDuration(transportMinutes) : null;

  // Format timestamps
  const createdDate = new Date(activity.created_at);
  const updatedDate = new Date(activity.updated_at);
  const formattedCreatedAt = `Created: ${format(createdDate, "MMM d, yyyy, h:mm a")}`;
  const formattedUpdatedAt = `Updated: ${format(updatedDate, "MMM d, yyyy, h:mm a")}`;

  return {
    id: activity.id,
    dayId,
    title: activity.title,
    description: activity.description,
    durationMinutes: activity.duration_minutes,
    formattedDuration,
    transportMinutes,
    formattedTransport,
    hasTransport: transportMinutes > 0,
    orderIndex: activity.order_index,
    createdAt: activity.created_at,
    updatedAt: activity.updated_at,
    formattedCreatedAt,
    formattedUpdatedAt,
  };
}

/**
 * Transforms day DTO to ViewModel with flat activities
 */
function transformDayToViewModel(day: PlanDto["days"][0]): DayViewModel {
  const dayDate = new Date(day.day_date);
  const formattedDate = format(dayDate, "EEEE, MMMM d, yyyy");

  return {
    id: day.id,
    dayIndex: day.day_index,
    dayDate: day.day_date,
    formattedDate,
    totalDurationMinutes: day.total_duration_minutes,
    formattedDuration: formatDuration(day.total_duration_minutes),
    warning: day.warning,
    hasWarning: day.warning !== null,
    activities: day.activities.map((activity) => transformActivityToViewModel(activity, day.id)),
  };
}

/**
 * Transforms complete plan DTO to ViewModel
 * Main transformation function used by usePlan hook
 */
export function transformPlanToViewModel(planDto: PlanDto): PlanDetailsViewModel {
  const formattedDateRange = formatDateRange(planDto.date_start, planDto.date_end);

  // Check if any day has warnings
  const hasWarnings = planDto.days.some((day) => day.warning !== null);

  return {
    id: planDto.id,
    name: planDto.name,
    destination: planDto.destination_text,
    dateStart: planDto.date_start,
    dateEnd: planDto.date_end,
    formattedDateRange,
    peopleCount: planDto.people_count,
    tripType: planDto.trip_type,
    comfort: planDto.comfort,
    budget: planDto.budget,
    transportModes: planDto.transport_modes ?? [],
    noteText: planDto.note_text,
    hasWarnings,
    days: planDto.days.map(transformDayToViewModel),
  };
}

/**
 * Result of drop position calculation
 */
export interface DropPositionResult {
  targetDayId: string;
  targetOrderIndex: number;
}

/**
 * Input parameters for drop position calculation
 */
export interface CalculateDropPositionParams {
  activityId: string;
  overElementId: string;
  days: DayViewModel[];
}

/**
 * Calculates the target day and position for a dropped activity
 *
 * Business Rules:
 * - When dropped on an activity in the same day: place at target activity's position
 * - When dropped on an activity in a different day: insert after target activity
 * - When dropped on a day container: append to end of that day
 * - Single activity in same day dropped on day container: no move needed (returns null)
 * - Order index is 1-based (database constraint, minimum value is 1)
 * - Array indices are 0-based and must be converted
 *
 * @param params - Activity ID, over element ID, and days array
 * @returns Drop position result or null if move is invalid/unnecessary
 */
export function calculateDropPosition(params: CalculateDropPositionParams): DropPositionResult | null {
  const { activityId, overElementId, days } = params;

  // Find source day and activity
  let sourceDay: DayViewModel | null = null;

  for (const day of days) {
    const index = day.activities.findIndex((a) => a.id === activityId);
    if (index !== -1) {
      sourceDay = day;
      break;
    }
  }

  if (!sourceDay) return null;

  // Determine if dropped on activity or day
  const targetDay = days.find((day) => day.id === overElementId);
  const droppedOnActivity = !targetDay;

  let finalTargetDayId: string | undefined;
  let targetOrderIndex: number | undefined;

  if (droppedOnActivity) {
    // Dropped on another activity - find its day and position
    for (const day of days) {
      const index = day.activities.findIndex((a) => a.id === overElementId);
      if (index !== -1) {
        finalTargetDayId = day.id;
        if (day.id === sourceDay.id) {
          // Moving within same day - place at target activity's position
          targetOrderIndex = index + 1; // Convert 0-based index to 1-based position
        } else {
          // Moving to different day - insert after the target activity
          targetOrderIndex = index + 2;
        }
        break;
      }
    }
  } else {
    // Dropped directly on day
    finalTargetDayId = overElementId;

    // If same day and only one activity, no move needed
    if (targetDay.id === sourceDay.id && sourceDay.activities.length === 1) {
      return null;
    }

    // Append to end of target day (1-based index)
    targetOrderIndex = targetDay.activities.length + 1;
  }

  // Ensure we have valid values
  if (!finalTargetDayId || targetOrderIndex === undefined) {
    return null;
  }

  // Ensure target_order_index is at least 1 (database constraint)
  if (targetOrderIndex < 1) {
    targetOrderIndex = 1;
  }

  return {
    targetDayId: finalTargetDayId,
    targetOrderIndex,
  };
}
