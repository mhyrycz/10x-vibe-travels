/**
 * Global Teardown for E2E Tests
 *
 * Cleans up test data from Supabase database after all tests have completed.
 * This ensures a clean state for subsequent test runs.
 *
 * Following Playwright best practices:
 * - Using project dependencies (recommended approach)
 * - Defined as a regular test using test() function
 * - Uses DatabaseHelper for reusable cleanup logic
 */

import { test as teardown } from "@playwright/test";
import { DatabaseHelper } from "./helpers/DatabaseHelper";

teardown("cleanup database - delete all test data", async () => {
  console.log("🧹 Starting global database cleanup...");

  try {
    const dbHelper = new DatabaseHelper();

    // Clean up all test data in correct order
    await dbHelper.cleanupAllTestData();

    console.log("✅ Global database cleanup completed successfully");
  } catch (error) {
    console.error("❌ Global database cleanup failed:", error);
    throw error;
  }
});
