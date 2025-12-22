/**
 * CreatePlanButton Component
 *
 * Button to create a new travel plan.
 * Disabled with tooltip when plan limit is reached.
 */

import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { PlusCircle } from "lucide-react";

interface CreatePlanButtonProps {
  isDisabled: boolean;
  planLimit: number;
}

export function CreatePlanButton({ isDisabled, planLimit }: CreatePlanButtonProps) {
  // Show tooltip only when disabled
  if (isDisabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">
              <Button disabled>
                <PlusCircle className="mr-2 h-5 w-5" />
                Create Plan
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>You&apos;ve reached the maximum of {planLimit} plans</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button asChild>
      <a href="/plans/new">
        <PlusCircle className="mr-2 h-5 w-5" />
        Create Plan
      </a>
    </Button>
  );
}
