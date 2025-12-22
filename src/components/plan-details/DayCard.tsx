import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BlockCard } from "./BlockCard";
import type { DayViewModel } from "./types";

interface DayCardProps {
  day: DayViewModel;
  onEditActivity: (activityId: string) => void;
}

export function DayCard({ day, onEditActivity }: DayCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Day {day.dayIndex} - {day.formattedDate}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {day.blocks.map((block) => (
          <BlockCard key={block.id} block={block} onEditActivity={onEditActivity} />
        ))}
      </CardContent>
    </Card>
  );
}
