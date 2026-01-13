/**
 * FormActions component
 * Form action buttons at the bottom of the preferences form
 * Contains the primary submit button with loading state indication
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface FormActionsProps {
  isLoading: boolean;
  disabled?: boolean;
}

/**
 * Form actions with submit button and loading state
 */
export default function FormActions({ isLoading, disabled }: FormActionsProps) {
  return (
    <div className="flex justify-end pt-6">
      <Button type="submit" disabled={isLoading || disabled} className="w-full sm:w-auto min-w-[200px]" data-testid="preferences-submit-button">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Complete Setup"
        )}
      </Button>
    </div>
  );
}
