/**
 * PeopleCountField component
 * Number input field with increment/decrement buttons for selecting the number of travelers
 * Provides an intuitive interface for adjusting the count without manual typing
 */

import React from "react";
import { useFormContext } from "react-hook-form";
import { Minus, Plus } from "lucide-react";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { PreferencesFormValues } from "./validation";

/**
 * Number of travelers input with +/- buttons
 * Enforces min (1) and max (20) boundaries
 */
export default function PeopleCountField() {
  const { control } = useFormContext<PreferencesFormValues>();

  return (
    <FormField
      control={control}
      name="people_count"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Number of travelers</FormLabel>
          <FormControl>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  const newValue = Math.max(1, (field.value || 1) - 1);
                  field.onChange(newValue);
                }}
                disabled={field.value <= 1}
                aria-label="Decrease number of travelers"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min={1}
                max={20}
                className="text-center"
                {...field}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value)) {
                    field.onChange(Math.min(20, Math.max(1, value)));
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => {
                  const newValue = Math.min(20, (field.value || 1) + 1);
                  field.onChange(newValue);
                }}
                disabled={field.value >= 20}
                aria-label="Increase number of travelers"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </FormControl>
          <FormDescription>How many people will be traveling? (1-20)</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
