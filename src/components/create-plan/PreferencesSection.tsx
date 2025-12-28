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
    <div className="grid gap-4 md:grid-cols-2">
      {/* People Count */}
      <FormField
        control={form.control}
        name="people_count"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Number of Travelers</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                max={20}
                {...field}
                onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Trip Type */}
      <FormField
        control={form.control}
        name="trip_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Trip Type</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select trip type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="leisure">Leisure</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Comfort Level */}
      <FormField
        control={form.control}
        name="comfort"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Comfort Level</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select comfort level" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="relax">Relax - Slow pace, plenty of downtime</SelectItem>
                <SelectItem value="balanced">Balanced - Mix of activities and rest</SelectItem>
                <SelectItem value="intense">Intense - Packed schedule, maximize experiences</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Budget */}
      <FormField
        control={form.control}
        name="budget"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Budget</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select budget level" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="budget">Budget - Cost-effective options</SelectItem>
                <SelectItem value="moderate">Moderate - Balance cost and quality</SelectItem>
                <SelectItem value="luxury">Luxury - Premium experiences</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
