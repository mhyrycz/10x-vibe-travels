/**
 * Error state component for Edit Preferences view
 * Displays when preferences cannot be fetched from API
 * Provides contextual error messages and recovery options
 */

import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import { useNavigate } from "@/lib/navigation";

interface ErrorStateProps {
  error: Error & { status?: number; code?: string };
  onRetry: () => void;
}

export default function ErrorState({ error, onRetry }: ErrorStateProps) {
  // Determine error message and action based on error status
  const navigate = useNavigate();
  const getErrorContent = () => {
    if (error.status === 404) {
      return {
        title: "Preferences Not Found",
        message: "Preferences not found. Please complete your profile setup first.",
        action: "complete",
      };
    }

    if (error.status === 401) {
      return {
        title: "Session Expired",
        message: "Your session has expired. Please log in again.",
        action: "login",
      };
    }

    // Network error or other errors
    if (!error.status || error.status >= 500) {
      return {
        title: "Unable to Load Preferences",
        message: error.status
          ? "Unable to load preferences. Please try again later."
          : "Unable to load preferences. Please check your connection.",
        action: "retry",
      };
    }

    // Default error
    return {
      title: "Error Loading Preferences",
      message: error.message || "An error occurred while loading your preferences.",
      action: "retry",
    };
  };

  const { title, message, action } = getErrorContent();

  const handleAction = () => {
    if (action === "complete") {
      navigate("/onboarding/preferences");
    } else if (action === "login") {
      navigate("/login");
    } else {
      onRetry();
    }
  };

  const getActionLabel = () => {
    if (action === "complete") return "Complete Profile";
    if (action === "login") return "Log In";
    return "Retry";
  };

  return (
    <div className="bg-card border rounded-lg p-4 sm:p-6 shadow-sm">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-4">{message}</p>
          <Button onClick={handleAction} variant={action === "retry" ? "outline" : "default"} size="sm">
            {getActionLabel()}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
