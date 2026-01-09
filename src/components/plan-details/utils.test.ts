/**
 * Unit Tests for Plan Details Utilities
 *
 * Tests the drag-and-drop position calculation logic with all edge cases
 * and business rules. Following Vitest guidelines:
 * - Arrange-Act-Assert pattern
 * - Descriptive test names
 * - Type-safe assertions
 * - Isolated pure function testing
 */

import { describe, it, expect } from "vitest";
import { calculateDropPosition } from "./utils";
import type { DayViewModel } from "./types";

// Helper to create mock day with activities
function createMockDay(id: string, dayIndex: number, activityIds: string[]): DayViewModel {
  return {
    id,
    dayIndex,
    dayDate: `2026-01-${10 + dayIndex}`,
    formattedDate: `Day ${dayIndex}`,
    totalDurationMinutes: 0,
    formattedDuration: "0min",
    warning: null,
    hasWarning: false,
    activities: activityIds.map((activityId, index) => ({
      id: activityId,
      dayId: id,
      title: `Activity ${activityId}`,
      description: null,
      durationMinutes: 60,
      formattedDuration: "1h",
      transportMinutes: 0,
      formattedTransport: null,
      hasTransport: false,
      orderIndex: index + 1,
      createdAt: "2026-01-09T10:00:00Z",
      updatedAt: "2026-01-09T10:00:00Z",
      formattedCreatedAt: "Created: Jan 9, 2026",
      formattedUpdatedAt: "Updated: Jan 9, 2026",
    })),
  };
}

describe("calculateDropPosition", () => {
  describe("Same Day Movement", () => {
    it("should move activity within same day to target position", () => {
      const days = [
        createMockDay("day1", 1, ["activity1", "activity2", "activity3"]),
        createMockDay("day2", 2, ["activity4"]),
      ];

      // Move activity1 to position of activity3 (same day)
      const result = calculateDropPosition({
        activityId: "activity1",
        overElementId: "activity3",
        days,
      });

      expect(result).toEqual({
        targetDayId: "day1",
        targetOrderIndex: 3, // Position of activity3 (1-based)
      });
    });

    it("should return null when moving single activity within same day to itself", () => {
      const days = [createMockDay("day1", 1, ["activity1"]), createMockDay("day2", 2, ["activity2"])];

      // Drop single activity on its own day container
      const result = calculateDropPosition({
        activityId: "activity1",
        overElementId: "day1",
        days,
      });

      expect(result).toBeNull();
    });

    it("should move activity when dropped on day container with multiple activities", () => {
      const days = [
        createMockDay("day1", 1, ["activity1", "activity2", "activity3"]),
        createMockDay("day2", 2, ["activity4"]),
      ];

      // Move activity1 by dropping on day1 container (should append to end)
      const result = calculateDropPosition({
        activityId: "activity1",
        overElementId: "day1",
        days,
      });

      // Since it's same day with multiple activities, should append to end
      expect(result).toEqual({
        targetDayId: "day1",
        targetOrderIndex: 4, // activities.length + 1
      });
    });
  });

  describe("Cross-Day Movement", () => {
    it("should move activity to different day when dropped on activity", () => {
      const days = [
        createMockDay("day1", 1, ["activity1", "activity2"]),
        createMockDay("day2", 2, ["activity3", "activity4"]),
      ];

      // Move activity1 from day1 to position after activity3 in day2
      const result = calculateDropPosition({
        activityId: "activity1",
        overElementId: "activity3",
        days,
      });

      expect(result).toEqual({
        targetDayId: "day2",
        targetOrderIndex: 2, // After activity3 (index 0 + 2)
      });
    });

    it("should append to end when dropped on empty day container", () => {
      const days = [createMockDay("day1", 1, ["activity1", "activity2"]), createMockDay("day2", 2, [])];

      // Move activity1 to empty day2
      const result = calculateDropPosition({
        activityId: "activity1",
        overElementId: "day2",
        days,
      });

      expect(result).toEqual({
        targetDayId: "day2",
        targetOrderIndex: 1, // First position in empty day
      });
    });

    it("should append to end when dropped on different day container", () => {
      const days = [createMockDay("day1", 1, ["activity1"]), createMockDay("day2", 2, ["activity2", "activity3"])];

      // Move activity1 by dropping on day2 container
      const result = calculateDropPosition({
        activityId: "activity1",
        overElementId: "day2",
        days,
      });

      expect(result).toEqual({
        targetDayId: "day2",
        targetOrderIndex: 3, // After last activity in day2
      });
    });
  });

  describe("Position Calculation Edge Cases", () => {
    it("should calculate correct position for activity1 in target day", () => {
      const days = [createMockDay("day1", 1, ["activity1"]), createMockDay("day2", 2, ["activity2", "activity3"])];

      // Move activity1 from day1, drop on activity2 (first activity in day2)
      // Cross-day drop inserts AFTER target, so activity1 goes between activity2 and activity3
      const result = calculateDropPosition({
        activityId: "activity1",
        overElementId: "activity2",
        days,
      });

      expect(result).toEqual({
        targetDayId: "day2",
        targetOrderIndex: 2, // After activity2 (cross-day insert after)
      });
    });

    it("should calculate correct position for last activity in target day", () => {
      const days = [createMockDay("day1", 1, ["activity1"]), createMockDay("day2", 2, ["activity2", "activity3"])];

      // Move activity1 after last activity in day2
      const result = calculateDropPosition({
        activityId: "activity1",
        overElementId: "activity3",
        days,
      });

      expect(result).toEqual({
        targetDayId: "day2",
        targetOrderIndex: 3, // After activity3 (index 1 + 2 for cross-day)
      });
    });

    it("should enforce minimum order index of 1 (database constraint)", () => {
      const days = [createMockDay("day1", 1, ["activity1"]), createMockDay("day2", 2, [])];

      // Move to empty day (should get index 1, not 0)
      const result = calculateDropPosition({
        activityId: "activity1",
        overElementId: "day2",
        days,
      });

      expect(result).toEqual({
        targetDayId: "day2",
        targetOrderIndex: 1,
      });
    });
  });

  describe("Array Index to Database Position Conversion", () => {
    it("should convert array index to database position for same day movement", () => {
      const days = [createMockDay("day1", 1, ["activity1", "activity2", "activity3", "activity4"])];

      // Drop activity1 on activity3 (activity3 is at array index 2)
      // Same-day logic: targetOrderIndex = array index + 1 = 3
      const result = calculateDropPosition({
        activityId: "activity1",
        overElementId: "activity3",
        days,
      });

      expect(result).toEqual({
        targetDayId: "day1",
        targetOrderIndex: 3, // array index 2 + 1 (database position is 1-based)
      });
    });

    it("should add 2 to array index for cross-day drop (insert after behavior)", () => {
      const days = [createMockDay("day1", 1, ["activity1"]), createMockDay("day2", 2, ["activity2", "activity3"])];

      // Drop activity1 on activity2 (activity2 is at array index 0 in day2)
      // Cross-day logic: targetOrderIndex = array index + 2 = 2 (inserts AFTER target)
      const result = calculateDropPosition({
        activityId: "activity1",
        overElementId: "activity2",
        days,
      });

      expect(result).toEqual({
        targetDayId: "day2",
        targetOrderIndex: 2, // array index 0 + 2 (insert after target activity)
      });
    });
  });

  describe("Invalid Input Handling", () => {
    it("should return null when activity not found in any day", () => {
      const days = [createMockDay("day1", 1, ["activity1"]), createMockDay("day2", 2, ["activity2"])];

      const result = calculateDropPosition({
        activityId: "nonexistent",
        overElementId: "activity1",
        days,
      });

      expect(result).toBeNull();
    });

    it("should return null when over element is neither activity nor day", () => {
      const days = [createMockDay("day1", 1, ["activity1"]), createMockDay("day2", 2, ["activity2"])];

      const result = calculateDropPosition({
        activityId: "activity1",
        overElementId: "invalid-id",
        days,
      });

      expect(result).toBeNull();
    });

    it("should return null when days array is empty", () => {
      const days: DayViewModel[] = [];

      const result = calculateDropPosition({
        activityId: "activity1",
        overElementId: "day1",
        days,
      });

      expect(result).toBeNull();
    });
  });

  describe("Complex Multi-Day Scenarios", () => {
    it("should handle movement in plan with many days", () => {
      const days = [
        createMockDay("day1", 1, ["activity1", "activity2"]),
        createMockDay("day2", 2, ["activity3"]),
        createMockDay("day3", 3, ["activity4", "activity5", "activity6"]),
        createMockDay("day4", 4, ["activity7"]),
      ];

      // Move activity2 from day1 to position after activity5 in day3
      const result = calculateDropPosition({
        activityId: "activity2",
        overElementId: "activity5",
        days,
      });

      expect(result).toEqual({
        targetDayId: "day3",
        targetOrderIndex: 3, // activity5 is at index 1, so 1 + 2 = 3
      });
    });

    it("should handle moving first activity to last position in different day", () => {
      const days = [
        createMockDay("day1", 1, ["activity1", "activity2", "activity3"]),
        createMockDay("day2", 2, ["activity4", "activity5"]),
      ];

      // Move first activity from day1 to end of day2
      const result = calculateDropPosition({
        activityId: "activity1",
        overElementId: "day2",
        days,
      });

      expect(result).toEqual({
        targetDayId: "day2",
        targetOrderIndex: 3, // Append after 2 activities
      });
    });

    it("should handle moving last activity to position after first activity in different day", () => {
      const days = [
        createMockDay("day1", 1, ["activity1", "activity2", "activity3"]),
        createMockDay("day2", 2, ["activity4", "activity5"]),
      ];

      // Move last activity from day1, drop on activity4 (first activity in day2)
      // Result: activity3 goes between activity4 and activity5 (second position)
      const result = calculateDropPosition({
        activityId: "activity3",
        overElementId: "activity4",
        days,
      });

      expect(result).toEqual({
        targetDayId: "day2",
        targetOrderIndex: 2, // After activity4 (index 0 + 2)
      });
    });
  });

  describe("Boundary Conditions", () => {
    it("should handle single day with single activity", () => {
      const days = [createMockDay("day1", 1, ["activity1"])];

      // Try to drop on itself
      const result = calculateDropPosition({
        activityId: "activity1",
        overElementId: "day1",
        days,
      });

      expect(result).toBeNull(); // Same day, single activity
    });

    it("should handle single day with two activities", () => {
      const days = [createMockDay("day1", 1, ["activity1", "activity2"])];

      // Move activity1 to activity2 position
      const result = calculateDropPosition({
        activityId: "activity1",
        overElementId: "activity2",
        days,
      });

      expect(result).toEqual({
        targetDayId: "day1",
        targetOrderIndex: 2, // Position of activity2
      });
    });

    it("should handle maximum realistic day count (30 days)", () => {
      const days = Array.from({ length: 30 }, (_, i) => createMockDay(`day${i + 1}`, i + 1, [`activity${i + 1}`]));

      // Move activity from first day to last day
      const result = calculateDropPosition({
        activityId: "activity1",
        overElementId: "day30",
        days,
      });

      expect(result).toEqual({
        targetDayId: "day30",
        targetOrderIndex: 2, // Append after existing activity
      });
    });
  });

  describe("Type Safety and Null Handling", () => {
    it("should return result with correct TypeScript types", () => {
      const days = [createMockDay("day1", 1, ["activity1"]), createMockDay("day2", 2, ["activity2"])];

      const result = calculateDropPosition({
        activityId: "activity1",
        overElementId: "activity2",
        days,
      });

      // TypeScript should infer the correct types
      if (result) {
        expect(typeof result.targetDayId).toBe("string");
        expect(typeof result.targetOrderIndex).toBe("number");
        expect(result.targetOrderIndex).toBeGreaterThanOrEqual(1);
      }
    });

    it("should handle days with activities that have null descriptions", () => {
      const days = [createMockDay("day1", 1, ["activity1"]), createMockDay("day2", 2, ["activity2"])];

      // Ensure null handling doesn't break logic
      days[0].activities[0].description = null;
      days[1].activities[0].description = null;

      const result = calculateDropPosition({
        activityId: "activity1",
        overElementId: "activity2",
        days,
      });

      expect(result).toEqual({
        targetDayId: "day2",
        targetOrderIndex: 2,
      });
    });
  });
});
