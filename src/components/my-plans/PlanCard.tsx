/**
 * PlanCard Component
 *
 * Displays a single travel plan card with name, destination, and creation date.
 * Navigates to plan detail page on click.
 * Includes delete button with touch device detection.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { MapPin, Calendar, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { DeletePlanDialog } from "../plan-details/DeletePlanDialog";
import { cn } from "@/lib/utils";
import type { PlanCardViewModel } from "./types";

interface PlanCardProps {
  plan: PlanCardViewModel;
}

export function PlanCard({ plan }: PlanCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detect touch device capability
  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  return (
    <>
      <a href={plan.href} className="block transition-transform hover:scale-105">
        <Card className="group relative h-full cursor-pointer hover:shadow-lg">
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="line-clamp-2 text-xl">{plan.name}</CardTitle>
              {/* Delete button - always visible on touch devices, hover-only on desktop */}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 flex-shrink-0 transition-opacity",
                  isTouchDevice ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDeleteDialogOpen(true);
                }}
                aria-label={`Delete plan: ${plan.name}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Destination */}
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-2">{plan.destination}</span>
            </div>

            {/* Creation date */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>{plan.formattedDate}</span>
            </div>
          </CardContent>
        </Card>
      </a>

      <DeletePlanDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} plan={plan} />
    </>
  );
}
