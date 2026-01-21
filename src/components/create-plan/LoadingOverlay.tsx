/**
 * LoadingOverlay - Full-screen overlay during AI plan generation
 */

import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export default function LoadingOverlay({ isVisible, message }: LoadingOverlayProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loading-title"
      aria-describedby="loading-description"
    >
      <div className="flex flex-col items-center gap-4 rounded-lg bg-background p-8 shadow-lg">
        <Loader2 className="h-12 w-12 animate-spin text-primary" aria-hidden="true" />
        <div className="space-y-2 text-center">
          <h2 id="loading-title" className="text-xl font-semibold">
            {message || "Generating your travel plan..."}
          </h2>
          <p id="loading-description" className="text-sm text-muted-foreground">
            AI is building your trip. 30-day itineraries may take up to 3 minutes. Please don&apos;t close this page.
          </p>
        </div>
      </div>
    </div>
  );
}
