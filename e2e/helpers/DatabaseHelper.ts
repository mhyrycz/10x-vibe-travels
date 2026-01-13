/**
 * Database Helper for E2E Tests
 *
 * Provides reusable methods for cleaning up test data from Supabase database.
 * Used both in global teardown and individual test cleanup.
 *
 * Following best practices:
 * - Single responsibility (database operations only)
 * - Reusable across test files and global teardown
 * - Type-safe with proper error handling
 * - Detailed logging for debugging
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export class DatabaseHelper {
  private supabase: SupabaseClient;
  private testUserId: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;
    const testUserId = process.env.E2E_USERNAME_ID;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.test");
    }

    if (!testUserId) {
      throw new Error("E2E_USERNAME_ID must be set in .env.test");
    }

    // Use service role key to bypass Row Level Security for test cleanup
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    this.testUserId = testUserId;
  }

  /**
   * Delete user preferences for the test user
   * @returns Number of deleted records
   */
  async cleanupUserPreferences(): Promise<number> {
    try {
      const { error, count } = await this.supabase
        .from("user_preferences")
        .delete({ count: "exact" })
        .eq("user_id", this.testUserId);

      if (error) {
        throw new Error(`Failed to delete user preferences: ${error.message}`);
      }

      console.log(`✅ Deleted ${count ?? 0} user preference record(s) for user ${this.testUserId}`);
      return count ?? 0;
    } catch (error) {
      console.error("❌ Failed to cleanup user preferences:", error);
      throw error;
    }
  }

  /**
   * Delete travel plans for the test user
   * @returns Number of deleted records
   */
  async cleanupTravelPlans(): Promise<number> {
    try {
      const { error, count } = await this.supabase
        .from("plans")
        .delete({ count: "exact" })
        .eq("owner_id", this.testUserId);

      if (error) {
        throw new Error(`Failed to delete travel plans: ${error.message}`);
      }

      console.log(`✅ Deleted ${count ?? 0} travel plan(s) for user ${this.testUserId}`);
      return count ?? 0;
    } catch (error) {
      console.error("❌ Failed to cleanup travel plans:", error);
      throw error;
    }
  }

  //   /**
  //    * Delete activities associated with travel plans
  //    * @returns Number of deleted records
  //    */
  //   async cleanupActivities(): Promise<number> {
  //     try {
  //       // First, get all plan IDs for the test user
  //       const { data: plans, error: plansError } = await this.supabase
  //         .from("travel_plans")
  //         .select("id")
  //         .eq("user_id", this.testUserId);

  //       if (plansError) {
  //         throw new Error(`Failed to fetch travel plans: ${plansError.message}`);
  //       }

  //       if (!plans || plans.length === 0) {
  //         console.log("✅ No activities to delete (no plans found)");
  //         return 0;
  //       }

  //       const planIds = plans.map((plan) => plan.id);

  //       // Delete activities for these plans
  //       const { error: activitiesError, count } = await this.supabase
  //         .from("activities")
  //         .delete({ count: "exact" })
  //         .in("travel_plan_id", planIds);

  //       if (activitiesError) {
  //         throw new Error(`Failed to delete activities: ${activitiesError.message}`);
  //       }

  //       console.log(`✅ Deleted ${count ?? 0} activity/activities for user ${this.testUserId}`);
  //       return count ?? 0;
  //     } catch (error) {
  //       console.error("❌ Failed to cleanup activities:", error);
  //       throw error;
  //     }
  //   }

  /**
   * Delete all test data for the test user
   * Cleans up in correct order (child tables first, then parent tables)
   */
  async cleanupAllTestData(): Promise<void> {
    console.log("🧹 Starting complete database cleanup...");

    try {
      // Delete in correct order to respect foreign key constraints
      //   await this.cleanupActivities();
      await this.cleanupTravelPlans();
      await this.cleanupUserPreferences();

      console.log("✅ Complete database cleanup finished successfully");
    } catch (error) {
      console.error("❌ Database cleanup failed:", error);
      throw error;
    }
  }

  /**
   * Verify if user preferences exist for the test user
   * @returns True if preferences exist, false otherwise
   */
  async userPreferencesExist(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from("user_preferences")
        .select("id")
        .eq("user_id", this.testUserId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned" - expected when preferences don't exist
        throw new Error(`Failed to check user preferences: ${error.message}`);
      }

      return !!data;
    } catch (error) {
      console.error("❌ Failed to check user preferences:", error);
      throw error;
    }
  }

  /**
   * Get test user ID
   */
  getTestUserId(): string {
    return this.testUserId;
  }
}
