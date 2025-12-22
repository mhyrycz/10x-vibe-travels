import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateActivity } from "./hooks/usePlanMutations";
import type { ActivityViewModel } from "./types";

interface EditActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: ActivityViewModel;
  planId: string;
}

export function EditActivityModal({ open, onOpenChange, activity, planId }: EditActivityModalProps) {
  const [title, setTitle] = useState(activity.title);
  const [durationMinutes, setDurationMinutes] = useState(activity.durationMinutes.toString());
  const [transportMinutes, setTransportMinutes] = useState((activity.transportMinutes || 0).toString());

  const updateActivityMutation = useUpdateActivity(planId, activity.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const duration = parseInt(durationMinutes, 10);
    const transport = parseInt(transportMinutes, 10);

    if (isNaN(duration) || duration < 1 || duration > 1440) {
      return;
    }

    if (isNaN(transport) || transport < 0 || transport > 1440) {
      return;
    }

    updateActivityMutation.mutate(
      {
        title: title.trim(),
        duration_minutes: duration,
        transport_minutes: transport || null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleCancel = () => {
    // Reset form
    setTitle(activity.title);
    setDurationMinutes(activity.durationMinutes.toString());
    setTransportMinutes((activity.transportMinutes || 0).toString());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Activity Name</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter activity name"
                required
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="1440"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Duration must be between 1 and 1440 minutes (24 hours)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transport">Travel Time (minutes, optional)</Label>
              <Input
                id="transport"
                type="number"
                min="0"
                max="1440"
                value={transportMinutes}
                onChange={(e) => setTransportMinutes(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Time needed to travel to this activity</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={updateActivityMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateActivityMutation.isPending}>
              {updateActivityMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
