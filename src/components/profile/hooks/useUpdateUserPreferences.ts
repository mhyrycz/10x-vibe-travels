/**
 * Custom hook for updating user preferences
 * Implements PATCH /api/users/me/preferences with React Query mutation
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UpdateUserPreferencesDto, UserPreferencesDto, ErrorDto } from "../../../types";

/**
 * Hook to update user preferences via PATCH request
 *
 * @returns React Query mutation result with mutate function and state
 *
 * Features:
 * - Optimistic cache updates
 * - Automatic query invalidation on success
 * - Toast notifications for success/error
 * - No retry on failure (user-initiated action)
 * - Network mode "always" for immediate offline detection
 * - Type-safe request/response handling
 */
export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateUserPreferencesDto) => {
      const response = await fetch("/api/users/me/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = (await response.json()) as ErrorDto;
        const errorWithStatus = new Error(error.error.message) as Error & {
          status: number;
          code: string;
        };
        errorWithStatus.status = response.status;
        errorWithStatus.code = error.error.code;
        throw errorWithStatus;
      }

      return response.json() as Promise<UserPreferencesDto>;
    },
    onSuccess: (updatedPreferences) => {
      queryClient.setQueryData(["user", "preferences"], updatedPreferences);

      // Show success toast
      toast.success("Preferences updated successfully!", {
        description: "Your changes have been saved.",
      });
    },
    onError: (error: Error & { status?: number; code?: string }) => {
      // Show error toast with specific message
      toast.error("Failed to update preferences", {
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    },
    retry: false,
    networkMode: "always",
  });
}
