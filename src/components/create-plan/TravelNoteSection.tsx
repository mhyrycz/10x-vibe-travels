/**
 * TravelNoteSection - Textarea for freeform travel notes with character counter
 */

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import type { CreatePlanFormData } from "./types";

const MAX_CHARS = 20000;

export default function TravelNoteSection() {
  const form = useFormContext<CreatePlanFormData>();
  const noteText = form.watch("note_text");
  const charCount = noteText?.length || 0;

  const isError = charCount > MAX_CHARS;

  return (
    <FormField
      control={form.control}
      name="note_text"
      render={({ field }) => (
        <FormItem data-testid="travel-note-field">
          <div className="flex items-center justify-between">
            <FormLabel>Travel Note</FormLabel>
            <span
              className={cn("text-xs", isError && "text-destructive font-medium", !isError && "text-muted-foreground")}
              data-testid="travel-note-counter"
            >
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          </div>
          <FormControl>
            <Textarea
              placeholder="Share your travel ideas, must-see places, or any specific requests. The AI will use this to create your itinerary."
              className="min-h-[200px] resize-y"
              {...field}
              data-testid="travel-note-textarea"
            />
          </FormControl>
          <FormDescription>
            Share your travel ideas, must-see places, or any specific requests. The AI will use this to create your
            itinerary.
          </FormDescription>
          <FormMessage data-testid="travel-note-error" />
        </FormItem>
      )}
    />
  );
}
