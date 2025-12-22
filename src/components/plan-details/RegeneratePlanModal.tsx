import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles } from "lucide-react";
import { useRegeneratePlan } from "./hooks/usePlanMutations";
import type { PlanDetailsViewModel } from "./types";

interface RegeneratePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanDetailsViewModel;
}

export function RegeneratePlanModal({ open, onOpenChange, plan }: RegeneratePlanModalProps) {
  const [noteText, setNoteText] = useState(plan.noteText || "");
  const [comfort, setComfort] = useState(plan.comfort);
  const [selectedTransportModes, setSelectedTransportModes] = useState<string[]>(plan.transportModes);

  const regeneratePlanMutation = useRegeneratePlan(plan.id);

  // Sync state when plan changes (e.g., after edit)
  useEffect(() => {
    setNoteText(plan.noteText || "");
    setComfort(plan.comfort);
    setSelectedTransportModes(plan.transportModes);
  }, [plan.noteText, plan.comfort, plan.transportModes]);

  const transportOptions = [
    { value: "car", label: "Car" },
    { value: "walk", label: "Walk" },
    { value: "public", label: "Public Transport" },
  ];

  const handleTransportToggle = (mode: string) => {
    setSelectedTransportModes((prev) => (prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    regeneratePlanMutation.mutate(
      {
        note_text: noteText.trim() || undefined,
        comfort,
        transport_modes:
          selectedTransportModes.length > 0 ? (selectedTransportModes as ("car" | "walk" | "public")[]) : undefined,
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
    setNoteText(plan.noteText || "");
    setComfort(plan.comfort);
    setSelectedTransportModes(plan.transportModes);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Regenerate Plan</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                This will regenerate all days, blocks, and activities based on the updated preferences. Your current
                itinerary will be replaced.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comfort">Comfort Level</Label>
              <select
                id="comfort"
                value={comfort}
                onChange={(e) => setComfort(e.target.value as "relax" | "balanced" | "intense")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              >
                <option value="relax">Relax</option>
                <option value="balanced">Balanced</option>
                <option value="intense">Intense</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Transport Modes</Label>
              <div className="space-y-2">
                {transportOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.value}
                      checked={selectedTransportModes.includes(option.value)}
                      onCheckedChange={() => handleTransportToggle(option.value)}
                    />
                    <label
                      htmlFor={option.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
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
                placeholder="Describe what you want AI to focus on when regenerating your plan..."
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={regeneratePlanMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={regeneratePlanMutation.isPending}>
              {regeneratePlanMutation.isPending ? "Regenerating..." : "Regenerate Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
