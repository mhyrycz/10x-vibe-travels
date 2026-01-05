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

  return {
    id: activity.id,
    dayId,
    title: activity.title,
    durationMinutes: activity.duration_minutes,
    formattedDuration,
    transportMinutes,
    formattedTransport,
    hasTransport: transportMinutes > 0,
    orderIndex: activity.order_index,
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
