/**
 * Form action buttons for Edit Preferences form
 * Handles Cancel and Save actions with proper state management
 */

import { Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";

interface FormActionsProps {
  isLoading: boolean;
  isDirty: boolean;
  isValid: boolean;
  onCancel: () => void;
}

export default function FormActions({ isLoading, isDirty, isValid, onCancel }: FormActionsProps) {
  const isSaveDisabled = !isDirty || !isValid || isLoading;

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="sm:w-auto w-full">
        Cancel
      </Button>
      <Button type="submit" disabled={isSaveDisabled} className="sm:w-auto w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Changes"
        )}
      </Button>
    </div>
  );
}
