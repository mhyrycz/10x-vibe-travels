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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useDeletePlan } from "./hooks/usePlanMutations";

interface DeletePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: {
    id: string;
    name: string;
  };
  onDeleted?: () => void;
}

export function DeletePlanDialog({ open, onOpenChange, plan, onDeleted }: DeletePlanDialogProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const deletePlanMutation = useDeletePlan(plan.id);

  // Reset confirmation when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setIsConfirmed(false);
    }
  }, [open]);

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConfirmed) {
      return;
    }

    deletePlanMutation.mutate(undefined, {
      onSuccess: () => {
        onOpenChange(false);
        // Small delay to allow modal close animation
        if (onDeleted) {
          setTimeout(() => {
            onDeleted();
          }, 500);
        }
      },
    });
  };

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
            <div className="flex items-start space-x-3">
              <Checkbox
                id="confirm-delete"
                checked={isConfirmed}
                onCheckedChange={(checked) => setIsConfirmed(checked === true)}
                disabled={deletePlanMutation.isPending}
                className="mt-1"
              />
              <Label htmlFor="confirm-delete" className="text-sm font-normal leading-tight cursor-pointer select-none">
                I understand this will permanently delete this plan
              </Label>
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
            <Button type="submit" variant="destructive" disabled={!isConfirmed || deletePlanMutation.isPending}>
              {deletePlanMutation.isPending ? "Deleting..." : "Delete Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
