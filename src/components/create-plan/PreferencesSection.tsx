/**
 * PreferencesSection - Travel preferences fields
 * Grid layout with people count, trip type, comfort level, and budget
 */

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormContext } from "react-hook-form";
import type { CreatePlanFormData } from "./types";

export default function PreferencesSection() {
  const form = useFormContext<CreatePlanFormData>();

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="preferences-section">
      {/* People Count */}
      <FormField
        control={form.control}
        name="people_count"
        render={({ field }) => (
          <FormItem data-testid="people-count-field">
            <FormLabel>Number of Travelers</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                max={20}
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                data-testid="people-count-input"
              />
            </FormControl>
            <FormMessage data-testid="people-count-error" />
          </FormItem>
        )}
      />

      {/* Trip Type */}
      <FormField
        control={form.control}
        name="trip_type"
        render={({ field }) => (
          <FormItem data-testid="trip-type-field">
            <FormLabel>Trip Type</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger data-testid="trip-type-select">
                  <SelectValue placeholder="Select trip type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="leisure" data-testid="trip-type-leisure">
                  Leisure
                </SelectItem>
                <SelectItem value="business" data-testid="trip-type-business">
                  Business
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage data-testid="trip-type-error" />
          </FormItem>
        )}
      />

      {/* Comfort Level */}
      <FormField
        control={form.control}
        name="comfort"
        render={({ field }) => (
          <FormItem data-testid="comfort-field">
            <FormLabel>Comfort Level</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger data-testid="comfort-select">
                  <SelectValue placeholder="Select comfort level" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="relax" data-testid="comfort-relax">
                  Relax - Slow pace, plenty of downtime
                </SelectItem>
                <SelectItem value="balanced" data-testid="comfort-balanced">
                  Balanced - Mix of activities and rest
                </SelectItem>
                <SelectItem value="intense" data-testid="comfort-intense">
                  Intense - Packed schedule, maximize experiences
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage data-testid="comfort-error" />
          </FormItem>
        )}
      />

      {/* Budget */}
      <FormField
        control={form.control}
        name="budget"
        render={({ field }) => (
          <FormItem data-testid="budget-field">
            <FormLabel>Budget</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger data-testid="budget-select">
                  <SelectValue placeholder="Select budget level" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="budget" data-testid="budget-budget">
                  Budget - Cost-effective options
                </SelectItem>
                <SelectItem value="moderate" data-testid="budget-moderate">
                  Moderate - Balance cost and quality
                </SelectItem>
                <SelectItem value="luxury" data-testid="budget-luxury">
                  Luxury - Premium experiences
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage data-testid="budget-error" />
          </FormItem>
        )}
      />
    </div>
  );
}
