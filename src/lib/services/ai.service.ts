/**
 * AI Service for Travel Itinerary Generation
 *
 * Handles communication with OpenRouter.ai API for AI-powered itinerary generation.
 * Supports mock mode for development to avoid API costs and enable fast testing.
 */

import type { CreatePlanDto } from "../../types";

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
// OpenRouter.ai Integration (Production Mode)
// ============================================================================

/**
 * Calls OpenRouter.ai API to generate travel itinerary
 * Uses Claude 3.5 Sonnet for high-quality travel planning
 *
 * @param params - Plan creation parameters
 * @returns AI-generated itinerary data
 * @throws Error if API call fails or times out
 */
async function callOpenRouterAI(params: CreatePlanDto): Promise<AIItineraryResponse> {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  const baseUrl = import.meta.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  // Calculate trip length
  const startDate = new Date(params.date_start);
  const endDate = new Date(params.date_end);
  const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Build prompt
  const systemPrompt = `You are an expert travel planning assistant. Create detailed, realistic travel itineraries based on user preferences. Return responses in valid JSON format only.`;

  const transportInfo =
    params.transport_modes && params.transport_modes.length > 0
      ? `Preferred transport: ${params.transport_modes.join(", ")}`
      : "Transport: flexible (choose best options)";

  const userPrompt = `Create a detailed ${dayCount}-day travel itinerary for ${params.destination_text}.

Trip Details:
- Dates: ${params.date_start} to ${params.date_end}
- Travelers: ${params.people_count} ${params.people_count === 1 ? "person" : "people"}
- Trip Type: ${params.trip_type}
- Comfort Level: ${params.comfort} (relax=leisurely pace, balanced=moderate pace, intense=packed schedule)
- Budget: ${params.budget}
- ${transportInfo}

User Notes: ${params.note_text}

Create an itinerary with activities for morning, afternoon, and evening for each day. Return ONLY valid JSON in this exact format:
{
  "days": [
    {
      "day_index": 1,
      "activities": {
        "morning": [{"title": "Activity name", "duration_minutes": 120, "transport_minutes": 15}],
        "afternoon": [{"title": "Activity name", "duration_minutes": 90, "transport_minutes": 10}],
        "evening": [{"title": "Activity name", "duration_minutes": 120, "transport_minutes": 20}]
      }
    }
  ]
}

Guidelines:
- Each block should have 1-3 activities
- duration_minutes: 60-180 for main activities
- transport_minutes: 5-30 for travel between locations (can be null if walking distance)
- Consider the comfort level when scheduling activities
- Match budget level with activity choices
- Include specific, actionable activities (not generic descriptions)`;

  // Make API request with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from AI response");
    }

    const itinerary = JSON.parse(jsonMatch[0]) as AIItineraryResponse;

    // Validate response structure
    if (!itinerary.days || !Array.isArray(itinerary.days)) {
      throw new Error("Invalid itinerary structure: missing days array");
    }

    return itinerary;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AI service timeout - please try again");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// Main Service Function
// ============================================================================

/**
 * Generates travel itinerary using AI or mock data based on environment configuration
 *
 * @param params - Plan creation parameters
 * @returns Structured itinerary data (days with blocks and activities)
 *
 * Environment Variables:
 * - USE_MOCK_AI (boolean): If true, uses mock data instead of AI API (default: true)
 * - OPENROUTER_API_KEY (string): Required when USE_MOCK_AI is false
 * - OPENROUTER_BASE_URL (string): Optional, defaults to https://openrouter.ai/api/v1
 */
export async function generatePlanItinerary(params: CreatePlanDto): Promise<AIItineraryResponse> {
  // Check if mock mode is enabled (default to true for development)
  const useMockAI = import.meta.env.USE_MOCK_AI !== "false" && import.meta.env.USE_MOCK_AI !== false;

  if (useMockAI) {
    console.log("🎭 Using mock AI itinerary generator (development mode)");
    // Add small delay to simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    return generateMockItinerary(params);
  }

  console.log("🤖 Calling OpenRouter.ai for itinerary generation");
  return callOpenRouterAI(params);
}
