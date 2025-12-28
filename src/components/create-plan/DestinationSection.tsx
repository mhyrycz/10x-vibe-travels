/**
 * DestinationSection - Input field for travel destination
 */

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFormContext } from "react-hook-form";
import type { CreatePlanFormData } from "./types";

export default function DestinationSection() {
  const form = useFormContext<CreatePlanFormData>();

  return (
    <FormField
      control={form.control}
      name="destination_text"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Destination</FormLabel>
          <FormControl>
            <Input placeholder="e.g., Kraków, Poland" {...field} />
          </FormControl>
          <FormDescription>Where are you planning to travel?</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
