/**
 * AI Service for Travel Itinerary Generation
 *
 * Handles communication with OpenRouter.ai API for AI-powered itinerary generation.
 * Supports mock mode for development to avoid API costs and enable fast testing.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { CreatePlanDto } from "../../types";
import { getUserPreferences } from "./userPreferences.service";
import { OpenRouterService } from "./openrouter";
import { z } from "zod";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Represents a single activity within a time block
 */
export interface AIActivityResponse {
  title: string;
  duration_minutes: number;
  transport_minutes: number | null;
}

/**
 * Represents a time block (morning, afternoon, evening) with activities
 */
export interface AIBlockResponse {
  morning: AIActivityResponse[];
  afternoon: AIActivityResponse[];
  evening: AIActivityResponse[];
}

/**
 * Represents a single day in the itinerary
 */
export interface AIDayResponse {
  day_index: number;
  activities: AIBlockResponse;
}

/**
 * Complete AI service response structure
 */
export interface AIItineraryResponse {
  days: AIDayResponse[];
}

// ============================================================================
// Mock Itinerary Generator (Development Mode)
// ============================================================================

/**
 * Generates a realistic mock travel itinerary for development/testing
 * Creates varied activities across morning, afternoon, and evening blocks
 * Note: Mock generator does not use user preferences (age/country) for simplicity
 *
 * @param params - Plan creation parameters
 * @returns Structured mock itinerary data
 */
export function generateMockItinerary(params: CreatePlanDto): AIItineraryResponse {
  const { date_start, date_end, destination_text, comfort } = params;

  // Calculate number of days
  const startDate = new Date(date_start);
  const endDate = new Date(date_end);
  const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Sample activity templates based on comfort level
  const activityPool = {
    relax: {
      morning: [
        "Leisurely breakfast at hotel",
        "Morning walk in the park",
        "Visit local café",
        "Gentle sightseeing tour",
      ],
      afternoon: [
        "Lunch at scenic restaurant",
        "Visit museum at own pace",
        "Shopping in local markets",
        "Relax at spa",
      ],
      evening: ["Sunset viewing", "Dinner at recommended restaurant", "Evening stroll", "Local cultural show"],
    },
    balanced: {
      morning: ["Breakfast and city exploration", "Guided walking tour", "Visit main attractions", "Local market tour"],
      afternoon: [
        "Lunch at traditional restaurant",
        "Museum or gallery visit",
        "Afternoon activity or workshop",
        "Explore neighborhood",
      ],
      evening: [
        "Dinner at popular restaurant",
        "Evening entertainment",
        "Night market visit",
        "Local nightlife experience",
      ],
    },
    intense: {
      morning: ["Early start with breakfast", "Full morning tour", "Adventure activity", "Multiple attraction visits"],
      afternoon: ["Quick lunch break", "Afternoon adventures", "Active exploration", "Sports or outdoor activity"],
      evening: ["Dinner on the go", "Evening activities", "Nightlife exploration", "Late-night sightseeing"],
    },
  };

  const activities = activityPool[comfort] || activityPool.balanced;

  // Generate days
  const days: AIDayResponse[] = [];
  for (let i = 0; i < dayCount; i++) {
    const dayIndex = i + 1;

    // Select random activities for each block
    const morningActivity = activities.morning[i % activities.morning.length];
    const afternoonActivity = activities.afternoon[i % activities.afternoon.length];
    const eveningActivity = activities.evening[i % activities.evening.length];

    // Add destination context to first day
    const destinationPrefix = dayIndex === 1 ? `${destination_text} - ` : "";

    days.push({
      day_index: dayIndex,
      activities: {
        morning: [
          {
            title: `${destinationPrefix}${morningActivity}`,
            duration_minutes: 120 + Math.floor(Math.random() * 60), // 120-180 minutes
            transport_minutes: dayIndex === 1 ? 15 : Math.floor(Math.random() * 20) + 5, // 5-25 minutes
          },
        ],
        afternoon: [
          {
            title: afternoonActivity,
            duration_minutes: 90 + Math.floor(Math.random() * 90), // 90-180 minutes
            transport_minutes: Math.floor(Math.random() * 25) + 5, // 5-30 minutes
          },
        ],
        evening: [
          {
            title: eveningActivity,
            duration_minutes: 90 + Math.floor(Math.random() * 60), // 90-150 minutes
            transport_minutes: Math.floor(Math.random() * 20) + 5, // 5-25 minutes
          },
        ],
      },
    });
  }

  return { days };
}

// ============================================================================
// Zod Schema Definition
// ============================================================================

/**
 * Zod schema for validating AI-generated itinerary responses
 * Matches the AIItineraryResponse interface structure
 */
const activitySchema = z.object({
  title: z.string(),
  duration_minutes: z.number(),
  transport_minutes: z.number().nullable(),
});

const blockSchema = z.object({
  morning: z.array(activitySchema),
  afternoon: z.array(activitySchema),
  evening: z.array(activitySchema),
});

const daySchema = z.object({
  day_index: z.number(),
  activities: blockSchema,
});

const itinerarySchema = z.object({
  days: z.array(daySchema),
});

// ============================================================================
// OpenRouter.ai Integration (Production Mode)
// ============================================================================

/**
 * Calls OpenRouter.ai API to generate travel itinerary
 * Uses new OpenRouterService with structured outputs
 *
 * @param params - Plan creation parameters
 * @param userAge - User's age for personalized activity recommendations
 * @param userCountry - User's country of origin for travel context
 * @returns AI-generated itinerary data
 * @throws Error if API call fails or times out
 */
async function callOpenRouterAI(
  params: CreatePlanDto,
  userAge?: number,
  userCountry?: string
): Promise<AIItineraryResponse> {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  const baseUrl = import.meta.env.OPENROUTER_BASE_URL;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  // Initialize OpenRouter service
  const openRouter = new OpenRouterService({
    apiKey,
    baseUrl,
    defaultTimeout: 60000,
    enableLogging: import.meta.env.DEV,
  });

  // Calculate trip length
  const startDate = new Date(params.date_start);
  const endDate = new Date(params.date_end);
  const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Build transport information
  const transportInfo =
    params.transport_modes && params.transport_modes.length > 0
      ? `Preferred transport: ${params.transport_modes.join(", ")}`
      : "Transport: flexible (choose best options)";

  // Build user context information
  const userContext = [];
  if (userAge) {
    userContext.push(`Traveler age: ${userAge} years old`);
  }
  if (userCountry) {
    userContext.push(`Traveling from: ${userCountry}`);
  }
  const userContextInfo = userContext.length > 0 ? `\n- ${userContext.join("\n- ")}` : "";

  // Build system message
  const systemMessage =
    "You are an expert travel planning assistant. Create detailed, realistic travel itineraries based on user preferences.";

  // Build user prompt
  const userPrompt = `Create a detailed ${dayCount}-day travel itinerary for ${params.destination_text}.

Trip Details:
- Dates: ${params.date_start} to ${params.date_end}
- Travelers: ${params.people_count} ${params.people_count === 1 ? "person" : "people"}
- Trip Type: ${params.trip_type}
- Comfort Level: ${params.comfort} (relax=leisurely pace, balanced=moderate pace, intense=packed schedule)
- Budget: ${params.budget}
- ${transportInfo}${userContextInfo}

User Notes: ${params.note_text}

Guidelines:
- Each block should have 1-3 activities
- duration_minutes: 60-180 for main activities
- transport_minutes: 5-30 for travel between locations (can be null if walking distance)
- Consider the comfort level when scheduling activities
- Match budget level with activity choices
- Include specific, actionable activities (not generic descriptions)`;

  // Call OpenRouter service with structured output
  const response = await openRouter.chat<AIItineraryResponse>({
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userPrompt },
    ],
    responseSchema: {
      name: "travel_itinerary",
      description: "Structured travel itinerary with daily activities organized by time blocks",
      schema: itinerarySchema,
    },
    temperature: 0.7,
    maxTokens: 4000,
  });

  return response.data;
}

// ============================================================================
// Main Service Function
// ============================================================================

/**
 * Generates travel itinerary using AI or mock data based on environment configuration
 * Automatically fetches user preferences to personalize recommendations
 *
 * @param supabase - Supabase client instance for fetching user preferences
 * @param userId - User ID for fetching preferences
 * @param params - Plan creation parameters
 * @returns Structured itinerary data (days with blocks and activities)
 *
 * Environment Variables:
 * - USE_MOCK_AI (boolean): If true, uses mock data instead of AI API (default: true)
 * - OPENROUTER_API_KEY (string): Required when USE_MOCK_AI is false
 * - OPENROUTER_BASE_URL (string): Optional, defaults to https://openrouter.ai/api/v1
 */
export async function generatePlanItinerary(
  supabase: SupabaseClient<Database>,
  userId: string,
  params: CreatePlanDto
): Promise<AIItineraryResponse> {
  // Fetch user preferences for personalization (age and country)
  // Note: In development, all requests use DEFAULT_USER_ID, so all users share the same preferences
  // When JWT authentication is implemented, each user will have their own preferences
  let userAge: number | undefined;
  let userCountry: string | undefined;

  try {
    const preferencesResult = await getUserPreferences(supabase, userId);
    if (preferencesResult.success) {
      userAge = preferencesResult.data.age;
      userCountry = preferencesResult.data.country;
      console.log(`✅ User preferences loaded for AI personalization: age=${userAge}, country=${userCountry}`);
    } else {
      // User hasn't completed onboarding or preferences don't exist
      console.warn(`⚠️ Could not fetch user preferences: ${preferencesResult.error.message}`);
      // Continue without preferences - AI will work with plan params only
    }
  } catch (error) {
    // Log but don't fail - preferences are optional for AI generation
    console.error("Error fetching user preferences for AI:", error);
    // Continue without preferences - AI will work with plan params only
  }

  // Check if mock mode is enabled (default to true for development)
  const useMockAI = import.meta.env.USE_MOCK_AI !== "false" && import.meta.env.USE_MOCK_AI !== false;

  try {
    if (useMockAI) {
      console.log("🎭 Using mock AI itinerary generator (development mode)");
      // Add small delay to simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      return generateMockItinerary(params);
    }

    console.log("🤖 Calling OpenRouter.ai for itinerary generation");
    // Only pass user preferences to real AI for personalization
    return await callOpenRouterAI(params, userAge, userCountry);
  } catch (error) {
    // Re-throw with consistent error message for upstream error handling
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to generate travel itinerary");
  }
}
