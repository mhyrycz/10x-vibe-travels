/**
 * PlanCard Component
 *
 * Displays a single travel plan card with name, destination, and creation date.
 * Navigates to plan detail page on click.
 */

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { MapPin, Calendar } from "lucide-react";
import type { PlanCardViewModel } from "./types";

interface PlanCardProps {
  plan: PlanCardViewModel;
}

export function PlanCard({ plan }: PlanCardProps) {
  return (
    <a href={plan.href} className="block transition-transform hover:scale-105">
      <Card className="h-full cursor-pointer hover:shadow-lg">
        <CardHeader>
          <CardTitle className="line-clamp-2 text-xl">{plan.name}</CardTitle>
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
  );
}
