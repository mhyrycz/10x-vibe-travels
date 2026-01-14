/**
 * FormActions - Form submission and cancel buttons
 */

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface FormActionsProps {
  isSubmitting: boolean;
  canSubmit: boolean;
  onCancel?: () => void;
}

export default function FormActions({ isSubmitting, canSubmit, onCancel }: FormActionsProps) {
  return (
    <div className="flex gap-4" data-testid="form-actions">
      <Button
        type="submit"
        disabled={!canSubmit || isSubmitting}
        className="flex-1 md:flex-none md:min-w-[200px]"
        data-testid="create-plan-submit-button"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Plan...
          </>
        ) : (
          "Create Plan"
        )}
      </Button>

      {onCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          data-testid="create-plan-cancel-button"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
