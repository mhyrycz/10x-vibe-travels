import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, AlertTriangle } from "lucide-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { ActivityCard } from "./ActivityCard";
import type { DayViewModel } from "./types";

interface DayCardProps {
  day: DayViewModel;
  onEditActivity: (activityId: string) => void;
}

export function DayCard({ day, onEditActivity }: DayCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: day.id,
  });

  const activityIds = day.activities.map((activity) => activity.id);

  return (
    <Card className={isOver ? "ring-2 ring-primary" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Day {day.dayIndex} - {day.formattedDate}
          </CardTitle>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{day.formattedDuration}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {day.hasWarning && day.warning && (
          <Alert
            variant="default"
            className="border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{day.warning}</AlertDescription>
          </Alert>
        )}

        <div ref={setNodeRef} className="space-y-2">
          <SortableContext items={activityIds} strategy={verticalListSortingStrategy}>
            {day.activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No activities for this day</p>
            ) : (
              day.activities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} onEdit={() => onEditActivity(activity.id)} />
              ))
            )}
          </SortableContext>
        </div>
      </CardContent>
    </Card>
  );
}
