import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Users, Compass, Star, DollarSign, Train, Car } from "lucide-react";
import type { PlanDetailsViewModel } from "./types";

interface PlanMetadataProps {
  plan: PlanDetailsViewModel;
}

const transportIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  car: Car,
  walk: MapPin,
  public: Train,
};

const tripTypeLabels: Record<string, string> = {
  leisure: "Leisure",
  business: "Business",
  // Leave room for more types in the future
  //   adventure: "Adventure",
  //   cultural: "Cultural",
  //   romantic: "Romantic",
  //   family: "Family",
};

const comfortLabels: Record<string, string> = {
  relax: "Relax",
  balanced: "Balanced",
  intense: "Intense",
};

const budgetLabels: Record<string, string> = {
  budget: "Budget",
  moderate: "Moderate",
  luxury: "Luxury",
};

export function PlanMetadata({ plan }: PlanMetadataProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Destination */}
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-muted-foreground">Destination</div>
              <div className="mt-1 font-medium">{plan.destination}</div>
            </div>
          </div>

          {/* Date Range */}
          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-muted-foreground">Date Range</div>
              <div className="mt-1 font-medium">{plan.formattedDateRange}</div>
            </div>
          </div>

          {/* People Count */}
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-muted-foreground">Travelers</div>
              <div className="mt-1 font-medium">
                {plan.peopleCount} {plan.peopleCount === 1 ? "person" : "people"}
              </div>
            </div>
          </div>

          {/* Trip Type */}
          <div className="flex items-start gap-3">
            <Compass className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-muted-foreground">Trip Type</div>
              <div className="mt-1">
                <Badge variant="secondary">{tripTypeLabels[plan.tripType] || plan.tripType}</Badge>
              </div>
            </div>
          </div>

          {/* Comfort Level */}
          <div className="flex items-start gap-3">
            <Star className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-muted-foreground">Comfort Level</div>
              <div className="mt-1">
                <Badge variant="secondary">{comfortLabels[plan.comfort] || plan.comfort}</Badge>
              </div>
            </div>
          </div>

          {/* Budget Level */}
          <div className="flex items-start gap-3">
            <DollarSign className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-muted-foreground">Budget Level</div>
              <div className="mt-1">
                <Badge variant="secondary">{budgetLabels[plan.budget] || plan.budget}</Badge>
              </div>
            </div>
          </div>

          {/* Transport Modes */}
          {plan.transportModes.length > 0 && (
            <div className="flex items-start gap-3 sm:col-span-2">
              <Train className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-sm font-medium text-muted-foreground">Transport Modes</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {plan.transportModes.map((mode) => {
                    const Icon = transportIcons[mode] || Train;
                    return (
                      <Badge key={mode} variant="outline" className="gap-1">
                        <Icon className="h-3 w-3" />
                        {mode.replace("_", " ")}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Note */}
          {plan.noteText && (
            <div className="sm:col-span-2">
              <div className="text-sm font-medium text-muted-foreground">Notes</div>
              <div className="mt-1 text-sm text-muted-foreground">{plan.noteText}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
