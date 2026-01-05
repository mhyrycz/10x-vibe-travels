import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Clock, Edit, Trash2, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ActivityViewModel } from "./types";

interface ActivityCardProps {
  activity: ActivityViewModel;
  onEdit: () => void;
  onDelete: () => void;
}

export function ActivityCard({ activity, onEdit, onDelete }: ActivityCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg bg-card">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value={activity.id} className="border-0">
          <div className="flex items-start gap-2 px-4">
            <button
              className="mt-4 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-2">
                  <span className="text-base font-medium text-left">{activity.title}</span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{activity.formattedDuration}</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 pt-1">
                <div className="space-y-3">
                  {activity.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{activity.description}</p>
                  )}

                  {activity.hasTransport && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Travel time:</span> {activity.formattedTransport}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{activity.formattedCreatedAt}</span>
                    <span>{activity.formattedUpdatedAt}</span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={onEdit}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onDelete}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </div>
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
