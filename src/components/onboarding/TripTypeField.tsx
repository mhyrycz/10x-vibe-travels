/**
 * TripTypeField component
 * Radio group for selecting the primary trip type
 * Uses clear visual distinction between leisure (vacation) and business travel types
 */

import React from "react";
import { useFormContext } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { PreferencesFormValues } from "./validation";

/**
 * Trip type selector with leisure and business options
 */
export default function TripTypeField() {
  const { control } = useFormContext<PreferencesFormValues>();

  return (
    <FormField
      control={control}
      name="trip_type"
      render={({ field }) => (
        <FormItem className="space-y-3">
          <FormLabel>Trip type</FormLabel>
          <FormControl>
            <RadioGroup onValueChange={field.onChange} value={field.value ?? ""} className="flex flex-col space-y-1">
              <div className="flex items-center space-x-3 space-y-0">
                <RadioGroupItem value="leisure" id="leisure" />
                <Label htmlFor="leisure" className="font-normal cursor-pointer">
                  Leisure / Vacation
                </Label>
              </div>
              <div className="flex items-center space-x-3 space-y-0">
                <RadioGroupItem value="business" id="business" />
                <Label htmlFor="business" className="font-normal cursor-pointer">
                  Business
                </Label>
              </div>
            </RadioGroup>
          </FormControl>
          <FormDescription>Select the primary purpose of your typical trips</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
