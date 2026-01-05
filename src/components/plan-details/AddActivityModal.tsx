import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateActivity } from "./hooks/usePlanMutations";

interface AddActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  dayId: string;
}

export function AddActivityModal({ open, onOpenChange, planId, dayId }: AddActivityModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [transportMinutes, setTransportMinutes] = useState("0");

  const createActivityMutation = useCreateActivity(planId, dayId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const duration = parseInt(durationMinutes, 10);
    const transport = parseInt(transportMinutes, 10);

    if (isNaN(duration) || duration < 5 || duration > 720) {
      return;
    }

    if (isNaN(transport) || transport < 0 || transport > 600) {
      return;
    }

    createActivityMutation.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        duration_minutes: duration,
        transport_minutes: transport || null,
      },
      {
        onSuccess: () => {
          // Reset form
          setTitle("");
          setDescription("");
          setDurationMinutes("60");
          setTransportMinutes("0");
          onOpenChange(false);
        },
      }
    );
  };

  const handleCancel = () => {
    // Reset form
    setTitle("");
    setDescription("");
    setDurationMinutes("60");
    setTransportMinutes("0");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Custom Activity</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Activity Name *</Label>
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
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter activity description (up to 500 characters)"
                maxLength={500}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">{description.length}/500 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                min="5"
                max="720"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Duration must be between 5 and 720 minutes (12 hours)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transport">Travel Time (minutes, optional)</Label>
              <Input
                id="transport"
                type="number"
                min="0"
                max="600"
                value={transportMinutes}
                onChange={(e) => setTransportMinutes(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Time needed to travel to this activity</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={createActivityMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createActivityMutation.isPending}>
              {createActivityMutation.isPending ? "Adding..." : "Add Activity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
