/**
 * CountryField component
 * Text input for country of origin
 * Helps AI understand travel context and distance considerations
 */

import React from "react";
import { useFormContext } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { PreferencesFormValues } from "./validation";

/**
 * Country of origin input field
 * Accepts string input with 2-120 character validation
 */
export default function CountryField() {
  const { control } = useFormContext<PreferencesFormValues>();

  return (
    <FormField
      control={control}
      name="country"
      render={({ field }) => (
        <FormItem data-testid="country-field">
          <FormLabel>Country of origin</FormLabel>
          <FormControl>
            <Input
              type="text"
              placeholder="e.g., Poland"
              className="h-10 sm:h-9"
              data-testid="country-input"
              {...field}
              aria-label="Your country of origin"
            />
          </FormControl>
          <FormDescription>Your home country (2-120 characters)</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
