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
import { RegeneratePlanModal } from "./RegeneratePlanModal";
import { DeletePlanDialog } from "./DeletePlanDialog";
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
      for (const block of day.blocks) {
        const activity = block.activities.find((a) => a.id === active.id);
        if (activity) {
          setActiveActivity(activity);
          return;
        }
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveActivity(null);

    if (!over || !viewModel) return;

    const activityId = active.id as string;
    const overElementId = over.id as string;

    // Find source block and activity
    let sourceBlock = null;

    for (const day of viewModel.days) {
      for (const block of day.blocks) {
        const index = block.activities.findIndex((a) => a.id === activityId);
        if (index !== -1) {
          sourceBlock = block;
          break;
        }
      }
      if (sourceBlock) break;
    }

    if (!sourceBlock) return;

    // Determine if dropped on activity or block
    const allBlocks = viewModel.days.flatMap((day) => day.blocks);
    const targetBlock = allBlocks.find((block) => block.id === overElementId);
    const droppedOnActivity = !targetBlock;

    let finalTargetBlockId: string | undefined;
    let targetOrderIndex: number | undefined;

    if (droppedOnActivity) {
      // Dropped on another activity - find its block and position
      for (const day of viewModel.days) {
        for (const block of day.blocks) {
          const index = block.activities.findIndex((a) => a.id === overElementId);
          if (index !== -1) {
            finalTargetBlockId = block.id;
            if (block.id === sourceBlock.id) {
              // Moving within same block - place at target activity's position
              targetOrderIndex = index + 1; // Convert 0-based index to 1-based position
            } else {
              // Moving to different block - insert after the target activity
              targetOrderIndex = index + 2;
            }
            break;
          }
        }
        if (finalTargetBlockId) break;
      }
    } else {
      // Dropped directly on block
      finalTargetBlockId = overElementId;

      // If same block and only one activity, no move needed
      if (targetBlock.id === sourceBlock.id) {
        return;
      }

      // Append to end of target block (1-based index)
      targetOrderIndex = targetBlock.activities.length + 1;
    }

    // Ensure we have valid values
    if (!finalTargetBlockId || targetOrderIndex === undefined) {
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
        target_block_id: finalTargetBlockId,
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

  // Collect all warnings from blocks
  const allWarnings: string[] = [];
  viewModel.days.forEach((day) => {
    day.blocks.forEach((block) => {
      if (block.warning) {
        allWarnings.push(`Day ${day.dayIndex}, ${block.blockLabel}: ${block.warning}`);
      }
    });
  });

  // Find activity for edit modal
  const activityToEdit = editActivityId
    ? viewModel.days
        .flatMap((day) => day.blocks)
        .flatMap((block) => block.activities)
        .find((activity) => activity.id === editActivityId)
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

        {/* Warning banner if any blocks have warnings */}
        <WarningBanner warnings={allWarnings} />

        {/* Days list with nested blocks and activities - Responsive spacing */}
        <div className="space-y-6 md:space-y-8">
          {viewModel.days.map((day) => (
            <DayCard key={day.id} day={day} onEditActivity={(activityId) => setEditActivityId(activityId)} />
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
      </div>

      {/* Drag overlay */}
      <DragOverlay>{activeActivity ? <ActivityCard activity={activeActivity} onEdit={() => {}} /> : null}</DragOverlay>
    </DndContext>
  );
}
