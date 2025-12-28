/**
 * AgeField component
 * Simple number input for user's age
 * Used by AI to tailor activity recommendations appropriately
 */

import React from "react";
import { useFormContext } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { PreferencesFormValues } from "./validation";

/**
 * Age input field with validation (13-120 years)
 */
export default function AgeField() {
  const { control } = useFormContext<PreferencesFormValues>();

  return (
    <FormField
      control={control}
      name="age"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Age</FormLabel>
          <FormControl>
            <Input
              type="number"
              placeholder="e.g., 30"
              min={13}
              max={120}
              {...field}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                field.onChange(isNaN(value) ? undefined : value);
              }}
            />
          </FormControl>
          <FormDescription>Your age helps us recommend age-appropriate activities (13-120)</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
