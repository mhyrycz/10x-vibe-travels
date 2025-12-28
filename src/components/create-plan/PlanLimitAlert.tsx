/**
 * PlanLimitAlert - Alert banner shown when user reaches 10-plan limit
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface PlanLimitAlertProps {
  isVisible: boolean;
  planLimit: number;
}

export default function PlanLimitAlert({ isVisible, planLimit }: PlanLimitAlertProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <Alert variant="destructive" role="alert" aria-live="polite">
      <AlertCircle className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>Plan Limit Reached</AlertTitle>
      <AlertDescription className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span>
          You have reached the maximum of {planLimit} plans. Please delete an existing plan to create a new one.
        </span>
        <Button variant="outline" size="sm" asChild className="w-fit">
          <a href="/" aria-label="Navigate to My Plans page to manage existing plans">
            Go to My Plans
          </a>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
