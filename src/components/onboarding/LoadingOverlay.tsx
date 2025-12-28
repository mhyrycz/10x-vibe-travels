/**
 * LoadingOverlay component
 * Full-screen overlay with loading spinner displayed during API submission
 * Prevents user interaction while preferences are being saved
 */

import React from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface LoadingOverlayProps {
  isVisible: boolean;
}

/**
 * Full-screen loading overlay with accessibility support
 * Blocks all interactions while showing progress feedback
 */
export default function LoadingOverlay({ isVisible }: LoadingOverlayProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loading-title"
      aria-describedby="loading-description"
      aria-busy="true"
    >
      <Card className="p-6 sm:p-8 flex flex-col items-center gap-4 max-w-sm w-full shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <div className="text-center">
          <p id="loading-title" className="font-medium text-base sm:text-lg">
            Saving your preferences...
          </p>
          <p id="loading-description" className="text-sm text-muted-foreground mt-1 leading-relaxed">
            This will only take a moment
          </p>
        </div>
      </Card>
    </div>
  );
}
