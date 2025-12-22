import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, AlertTriangle } from "lucide-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { ActivityCard } from "./ActivityCard";
import type { BlockViewModel } from "./types";

interface BlockCardProps {
  block: BlockViewModel;
  onEditActivity: (activityId: string) => void;
}

export function BlockCard({ block, onEditActivity }: BlockCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: block.id,
  });

  const activityIds = block.activities.map((activity) => activity.id);

  return (
    <Card className={isOver ? "ring-2 ring-primary" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{block.blockLabel}</CardTitle>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{block.formattedDuration}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {block.warning && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{block.warning}</AlertDescription>
          </Alert>
        )}

        <div ref={setNodeRef} className="space-y-2">
          <SortableContext items={activityIds} strategy={verticalListSortingStrategy}>
            {block.activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} onEdit={() => onEditActivity(activity.id)} />
            ))}
          </SortableContext>
        </div>
      </CardContent>
    </Card>
  );
}
