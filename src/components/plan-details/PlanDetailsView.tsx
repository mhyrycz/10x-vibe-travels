/* eslint-disable @typescript-eslint/no-empty-function */
/**
 * PlanDetailsView Component
 *
 * Main orchestrating component for the Plan Details page.
 * Manages data fetching, modal states, and renders appropriate child components
 * based on loading/error/success states.
 */

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { usePlan } from "./hooks/usePlan";
import { useMoveActivity } from "./hooks/usePlanMutations";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { PlanHeader } from "./PlanHeader";
import { PlanMetadata } from "./PlanMetadata";
import { WarningBanner } from "./WarningBanner";
import { DayCard } from "./DayCard";
import { ActivityCard } from "./ActivityCard";
import { EditPlanModal } from "./EditPlanModal";
import { EditActivityModal } from "./EditActivityModal";
import { AddActivityModal } from "./AddActivityModal";
import { RegeneratePlanModal } from "./RegeneratePlanModal";
import { DeletePlanDialog } from "./DeletePlanDialog";
import { DeleteActivityDialog } from "./DeleteActivityDialog";
import type { ActivityViewModel } from "./types";
import { useNavigate } from "@/lib/navigation";

interface PlanDetailsViewProps {
  planId: string;
}

export function PlanDetailsView({ planId }: PlanDetailsViewProps) {
  const { data: viewModel, isLoading, isError, error, refetch } = usePlan(planId);
  const moveActivityMutation = useMoveActivity(planId);
  const navigate = useNavigate();

  // Modal states
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false);
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editActivityId, setEditActivityId] = useState<string | null>(null);
  const [addActivityDayId, setAddActivityDayId] = useState<string | null>(null);
  const [deleteActivityId, setDeleteActivityId] = useState<string | null>(null);

  // Drag-and-drop state
  const [activeActivity, setActiveActivity] = useState<ActivityViewModel | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (!viewModel) return;

    // Find the dragged activity
    for (const day of viewModel.days) {
      const activity = day.activities.find((a) => a.id === active.id);
      if (activity) {
        setActiveActivity(activity);
        return;
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveActivity(null);

    if (!over || !viewModel) return;

    const activityId = active.id as string;
    const overElementId = over.id as string;

    // Find source day and activity
    let sourceDay = null;

    for (const day of viewModel.days) {
      const index = day.activities.findIndex((a) => a.id === activityId);
      if (index !== -1) {
        sourceDay = day;
        break;
      }
    }

    if (!sourceDay) return;

    // Determine if dropped on activity or day
    const allDays = viewModel.days;
    const targetDay = allDays.find((day) => day.id === overElementId);
    const droppedOnActivity = !targetDay;

    let finalTargetDayId: string | undefined;
    let targetOrderIndex: number | undefined;

    if (droppedOnActivity) {
      // Dropped on another activity - find its day and position
      for (const day of viewModel.days) {
        const index = day.activities.findIndex((a) => a.id === overElementId);
        if (index !== -1) {
          finalTargetDayId = day.id;
          if (day.id === sourceDay.id) {
            // Moving within same day - place at target activity's position
            targetOrderIndex = index + 1; // Convert 0-based index to 1-based position
          } else {
            // Moving to different day - insert after the target activity
            targetOrderIndex = index + 2;
          }
          break;
        }
      }
    } else {
      // Dropped directly on day
      finalTargetDayId = overElementId;

      // If same day and only one activity, no move needed
      if (targetDay.id === sourceDay.id) {
        return;
      }

      // Append to end of target day (1-based index)
      targetOrderIndex = targetDay.activities.length + 1;
    }

    // Ensure we have valid values
    if (!finalTargetDayId || targetOrderIndex === undefined) {
      return;
    }

    // Ensure target_order_index is at least 1 (database constraint)
    if (targetOrderIndex < 1) {
      targetOrderIndex = 1;
    }

    // Call mutation
    moveActivityMutation.mutate({
      activityId,
      data: {
        target_day_id: finalTargetDayId,
        target_order_index: targetOrderIndex,
      },
    });
  };

  // Loading state
  if (isLoading) {
    return <LoadingState />;
  }

  // Error state
  if (isError) {
    const errorMessage = error?.message || "An unexpected error occurred";
    return <ErrorState errorMessage={errorMessage} onRetry={refetch} />;
  }

  // Success state (data loaded)
  if (!viewModel) {
    return <ErrorState errorMessage="No plan data available" onRetry={refetch} />;
  }

  // Collect all warnings from days
  const allWarnings: string[] = [];
  viewModel.days.forEach((day) => {
    if (day.warning) {
      allWarnings.push(`Day ${day.dayIndex}: ${day.warning}`);
    }
  });

  // Find activity for edit modal
  const activityToEdit = editActivityId
    ? viewModel.days.flatMap((day) => day.activities).find((activity) => activity.id === editActivityId)
    : null;

  // Find activity for delete dialog
  const activityToDelete = deleteActivityId
    ? viewModel.days.flatMap((day) => day.activities).find((activity) => activity.id === deleteActivityId)
    : null;

  const handlePlanDeleted = () => {
    // Navigate to plans list with View Transition
    if (typeof window !== "undefined") {
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          navigate("/");
        });
      } else {
        navigate("/");
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="container mx-auto max-w-7xl space-y-6 px-4 py-6 md:py-8"
        style={{ viewTransitionName: "plan-details" }}
      >
        {/* Header with breadcrumb and action buttons */}
        <PlanHeader
          planName={viewModel.name}
          onEditClick={() => setIsEditPlanModalOpen(true)}
          onRegenerateClick={() => setIsRegenerateModalOpen(true)}
          onDeleteClick={() => setIsDeleteDialogOpen(true)}
        />

        {/* Plan metadata card */}
        <PlanMetadata plan={viewModel} />

        {/* Warning banner if any days have warnings */}
        <WarningBanner warnings={allWarnings} />

        {/* Days list with flat activities - Responsive spacing */}
        <div className="space-y-6 md:space-y-8">
          {viewModel.days.map((day) => (
            <DayCard
              key={day.id}
              day={day}
              onEditActivity={(activityId) => setEditActivityId(activityId)}
              onDeleteActivity={(activityId) => setDeleteActivityId(activityId)}
              onAddActivity={(dayId) => setAddActivityDayId(dayId)}
            />
          ))}
        </div>

        {/* Modals */}
        <EditPlanModal open={isEditPlanModalOpen} onOpenChange={setIsEditPlanModalOpen} plan={viewModel} />

        <RegeneratePlanModal open={isRegenerateModalOpen} onOpenChange={setIsRegenerateModalOpen} plan={viewModel} />

        <DeletePlanDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          plan={viewModel}
          onDeleted={handlePlanDeleted}
        />

        {activityToEdit && (
          <EditActivityModal
            open={!!editActivityId}
            onOpenChange={(open) => !open && setEditActivityId(null)}
            activity={activityToEdit}
            planId={planId}
          />
        )}

        {addActivityDayId && (
          <AddActivityModal
            open={!!addActivityDayId}
            onOpenChange={(open) => !open && setAddActivityDayId(null)}
            planId={planId}
            dayId={addActivityDayId}
          />
        )}

        {activityToDelete && (
          <DeleteActivityDialog
            open={!!deleteActivityId}
            onOpenChange={(open) => !open && setDeleteActivityId(null)}
            planId={planId}
            activityId={activityToDelete.id}
            activityTitle={activityToDelete.title}
          />
        )}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeActivity ? <ActivityCard activity={activeActivity} onEdit={() => {}} onDelete={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
