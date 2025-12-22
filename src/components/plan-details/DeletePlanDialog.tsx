import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeletePlan } from "./hooks/usePlanMutations";
import type { PlanDetailsViewModel } from "./types";

interface DeletePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanDetailsViewModel;
  onDeleted: () => void;
}

export function DeletePlanDialog({ open, onOpenChange, plan, onDeleted }: DeletePlanDialogProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const deletePlanMutation = useDeletePlan(plan.id);

  // Reset confirmation text when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setConfirmationText("");
    }
  }, [open]);

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();

    if (confirmationText !== plan.name) {
      return;
    }

    deletePlanMutation.mutate(undefined, {
      onSuccess: () => {
        onOpenChange(false);
        // Small delay to allow modal close animation
        setTimeout(() => {
          onDeleted();
        }, 100);
      },
    });
  };

  const isConfirmationValid = confirmationText === plan.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleDelete}>
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete &ldquo;{plan.name}&rdquo; and remove all days,
              blocks, and activities from this plan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirmation">
                To confirm, type the plan name: <span className="font-semibold">{plan.name}</span>
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Enter plan name to confirm"
                autoComplete="off"
                disabled={deletePlanMutation.isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={deletePlanMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={!isConfirmationValid || deletePlanMutation.isPending}>
              {deletePlanMutation.isPending ? "Deleting..." : "Delete Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
