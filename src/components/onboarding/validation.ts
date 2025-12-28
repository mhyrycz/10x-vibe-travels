/**
 * Validation schemas and types for user preferences onboarding
 * Mirrors the API validation from userPreferences.service.ts
 */

import { z } from "zod";

/**
 * Zod schema for client-side form validation
 * Mirrors CreateUserPreferencesDto structure with runtime validation
 */
export const preferencesFormSchema = z.object({
  people_count: z
    .number({
      required_error: "Number of travelers is required",
      invalid_type_error: "Number of travelers must be a number",
    })
    .int("Number of travelers must be a whole number")
    .min(1, "At least 1 traveler is required")
    .max(20, "Maximum 20 travelers allowed"),
  trip_type: z.enum(["leisure", "business"], {
    required_error: "Please select a trip type",
    invalid_type_error: "Invalid trip type selected",
  }),
  age: z
    .number({
      required_error: "Age is required",
      invalid_type_error: "Age must be a number",
    })
    .int("Age must be a whole number")
    .min(13, "Minimum age is 13 years")
    .max(120, "Maximum age is 120 years"),
  country: z
    .string({
      required_error: "Country is required",
    })
    .min(2, "Country name must be at least 2 characters")
    .max(120, "Country name must not exceed 120 characters")
    .trim(),
  comfort: z.enum(["relax", "balanced", "intense"], {
    required_error: "Please select a comfort level",
    invalid_type_error: "Invalid comfort level selected",
  }),
  budget: z.enum(["budget", "moderate", "luxury"], {
    required_error: "Please select a budget level",
    invalid_type_error: "Invalid budget level selected",
  }),
});

/**
 * TypeScript type inferred from Zod schema
 * Used for form state typing in react-hook-form
 */
export type PreferencesFormValues = z.infer<typeof preferencesFormSchema>;
