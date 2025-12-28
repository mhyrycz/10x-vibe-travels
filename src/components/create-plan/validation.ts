/**
 * Zod validation schema for Create Plan form
 * Mirrors API validation requirements
 */

import { z } from "zod";

export const createPlanFormSchema = z
  .object({
    destination_text: z
      .string()
      .min(1, "Destination is required")
      .max(160, "Destination must be 160 characters or less"),

    date_start: z.string().refine(
      (date) => {
        const startDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return startDate >= today;
      },
      {
        message: "Start date cannot be in the past",
      }
    ),

    date_end: z.string(),

    note_text: z.string().max(20000, "Note must be 20,000 characters or less"),

    people_count: z
      .number()
      .int("Must be a whole number")
      .min(1, "At least 1 person required")
      .max(20, "Maximum 20 people allowed"),

    trip_type: z.enum(["leisure", "business"], {
      errorMap: () => ({ message: "Please select a trip type" }),
    }),

    comfort: z.enum(["relax", "balanced", "intense"], {
      errorMap: () => ({ message: "Please select a comfort level" }),
    }),

    budget: z.enum(["budget", "moderate", "luxury"], {
      errorMap: () => ({ message: "Please select a budget level" }),
    }),

    transport_modes: z.array(z.enum(["car", "walk", "public"])).nullable(),
  })
  .refine(
    (data) => {
      const startDate = new Date(data.date_start);
      const endDate = new Date(data.date_end);
      return endDate >= startDate;
    },
    {
      message: "End date must be equal to or after start date",
      path: ["date_end"],
    }
  )
  .refine(
    (data) => {
      const startDate = new Date(data.date_start);
      const endDate = new Date(data.date_end);
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return daysDiff <= 30;
    },
    {
      message: "Trip duration cannot exceed 30 days",
      path: ["date_end"],
    }
  );
