/**
 * ComfortField component
 * Radio group for selecting travel comfort level
 * Provides clear descriptions of what each comfort level means in terms of activity intensity
 */

import React from "react";
import { useFormContext } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { PreferencesFormValues } from "./validation";

/**
 * Travel comfort style selector with three intensity levels
 */
export default function ComfortField() {
  const { control } = useFormContext<PreferencesFormValues>();

  return (
    <FormField
      control={control}
      name="comfort"
      render={({ field }) => (
        <FormItem className="space-y-3" data-testid="comfort-field">
          <FormLabel>Travel comfort style</FormLabel>
          <FormControl>
            <RadioGroup onValueChange={field.onChange} value={field.value ?? ""} className="flex flex-col space-y-2" data-testid="comfort-radio-group">
              <div className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value="relax" id="relax" className="mt-1" data-testid="comfort-relax" />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="relax" className="font-medium cursor-pointer">
                    Relax
                  </Label>
                  <p className="text-sm text-muted-foreground">Leisurely pace, plenty of rest</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value="balanced" id="balanced" className="mt-1" data-testid="comfort-balanced" />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="balanced" className="font-medium cursor-pointer">
                    Balanced
                  </Label>
                  <p className="text-sm text-muted-foreground">Mix of activities and downtime</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value="intense" id="intense" className="mt-1" data-testid="comfort-intense" />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="intense" className="font-medium cursor-pointer">
                    Intense
                  </Label>
                  <p className="text-sm text-muted-foreground">Packed schedule, maximize sightseeing</p>
                </div>
              </div>
            </RadioGroup>
          </FormControl>
          <FormDescription>How do you prefer to experience your travels?</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
