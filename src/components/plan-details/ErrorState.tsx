/**
 * ErrorState Component
 *
 * Displays user-friendly error message when plan fetch fails.
 * Provides retry option and contextual messaging based on error type.
 */

import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  errorMessage: string;
  onRetry: () => void;
}

export function ErrorState({ errorMessage, onRetry }: ErrorStateProps) {
  // Determine if this is a permanent error (no retry needed)
  const isPermanentError = errorMessage.includes("permission") || errorMessage.includes("not found");

  // Get user-friendly title based on error type
  const getErrorTitle = () => {
    if (errorMessage.includes("permission")) {
      return "Access Denied";
    }
    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      return "Plan Not Found";
    }
    if (errorMessage.includes("Network")) {
      return "Network Error";
    }
    return "Failed to Load Plan";
  };

  return (
    <div className="container mx-auto mt-16 max-w-2xl px-4">
      <Alert variant="destructive">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold">{getErrorTitle()}</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-4">{errorMessage}</p>
          <div className="flex gap-3">
            {!isPermanentError && (
              <Button onClick={onRetry} variant="outline" size="sm">
                Try Again
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <a href="/">Back to My Plans</a>
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
