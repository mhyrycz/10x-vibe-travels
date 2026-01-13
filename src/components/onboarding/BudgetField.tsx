/**
 * BudgetField component
 * Radio group for selecting typical budget level
 * Helps AI recommend appropriately priced activities and accommodations
 */

import React from "react";
import { useFormContext } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { PreferencesFormValues } from "./validation";

/**
 * Travel budget selector with three price ranges
 */
export default function BudgetField() {
  const { control } = useFormContext<PreferencesFormValues>();

  return (
    <FormField
      control={control}
      name="budget"
      render={({ field }) => (
        <FormItem className="space-y-3" data-testid="budget-field">
          <FormLabel>Travel budget</FormLabel>
          <FormControl>
            <RadioGroup onValueChange={field.onChange} value={field.value ?? ""} className="flex flex-col space-y-2" data-testid="budget-radio-group">
              <div className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value="budget" id="budget" className="mt-1" data-testid="budget-budget" />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="budget" className="font-medium cursor-pointer">
                    Budget
                  </Label>
                  <p className="text-sm text-muted-foreground">Cost-conscious, affordable options</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value="moderate" id="moderate" className="mt-1" data-testid="budget-moderate" />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="moderate" className="font-medium cursor-pointer">
                    Moderate
                  </Label>
                  <p className="text-sm text-muted-foreground">Balance of value and comfort</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value="luxury" id="luxury" className="mt-1" data-testid="budget-luxury" />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="luxury" className="font-medium cursor-pointer">
                    Luxury
                  </Label>
                  <p className="text-sm text-muted-foreground">Premium experiences, high-end options</p>
                </div>
              </div>
            </RadioGroup>
          </FormControl>
          <FormDescription>Select your typical travel budget range</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
