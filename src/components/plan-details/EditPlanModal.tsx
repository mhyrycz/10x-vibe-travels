import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";
import { useUpdatePlan } from "./hooks/usePlanMutations";
import type { PlanDetailsViewModel } from "./types";

interface EditPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanDetailsViewModel;
}

export function EditPlanModal({ open, onOpenChange, plan }: EditPlanModalProps) {
  const [name, setName] = useState(plan.name);
  const [budget, setBudget] = useState(plan.budget);
  const [noteText, setNoteText] = useState(plan.noteText || "");
  const [peopleCount, setPeopleCount] = useState(plan.peopleCount.toString());

  const updatePlanMutation = useUpdatePlan(plan.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const peopleCountNum = parseInt(peopleCount, 10);
    if (isNaN(peopleCountNum) || peopleCountNum < 1 || peopleCountNum > 10) {
      return;
    }

    updatePlanMutation.mutate(
      {
        name: name.trim(),
        budget,
        note_text: noteText.trim() || undefined,
        people_count: peopleCountNum,
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
    setName(plan.name);
    setBudget(plan.budget);
    setNoteText(plan.noteText || "");
    setPeopleCount(plan.peopleCount.toString());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter plan name"
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="people_count">Number of Travelers</Label>
              <Input
                id="people_count"
                type="number"
                min="1"
                max="10"
                value={peopleCount}
                onChange={(e) => setPeopleCount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget Level</Label>
              <select
                id="budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value as "budget" | "moderate" | "luxury")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              >
                <option value="budget">Budget</option>
                <option value="moderate">Moderate</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note_text" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI Prompt (Optional)
              </Label>
              <Textarea
                id="note_text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Describe what you want AI to focus on in your plan..."
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={updatePlanMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={updatePlanMutation.isPending}>
              {updatePlanMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
