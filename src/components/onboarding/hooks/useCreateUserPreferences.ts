/**
 * Custom hook for creating user preferences during onboarding
 * Handles API call, loading state, and error handling
 */

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "@/lib/navigation";
import type { CreateUserPreferencesDto, UserPreferencesDto, ErrorDto } from "@/types";

/**
 * Custom hook for creating user preferences during onboarding
 * Handles API call, loading state, and error handling
 */
export function useCreateUserPreferences() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: CreateUserPreferencesDto) => {
      const response = await fetch("/api/users/me/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = (await response.json()) as ErrorDto;
        const errorWithStatus = new Error(error.error.message) as Error & { status: number; code: string };
        errorWithStatus.status = response.status;
        errorWithStatus.code = error.error.code;
        throw errorWithStatus;
      }

      return response.json() as Promise<UserPreferencesDto>;
    },
    onSuccess: () => {
      // Show success toast
      toast.success("Preferences saved successfully!", {
        description: "Redirecting to create your first travel plan...",
      });

      // Navigate to create first plan
      navigate("/plans/new");
    },
    onError: (error: Error & { status?: number; code?: string }) => {
      // Show error toast with specific message
      toast.error("Failed to save preferences", {
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    },
    retry: false, // Don't retry preference creation
    networkMode: "always", // Fail immediately if offline
  });
}
