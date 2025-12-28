/**
 * DateRangeSection - Date picker fields for travel date range
 * Refactored to DRY with DatePickerField component
 */

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import type { CreatePlanFormData } from "./types";

interface DatePickerFieldProps {
  name: "date_start" | "date_end";
  label: string;
  disabled?: (date: Date) => boolean;
}

function DatePickerField({ name, label, disabled }: DatePickerFieldProps) {
  const form = useFormContext<CreatePlanFormData>();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                >
                  {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value ? new Date(field.value) : undefined}
                onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                disabled={disabled}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default function DateRangeSection() {
  const form = useFormContext<CreatePlanFormData>();
  const [tripDuration, setTripDuration] = useState<number | null>(null);

  const dateStart = form.watch("date_start");
  const dateEnd = form.watch("date_end");

  // Calculate trip duration
  useEffect(() => {
    if (dateStart && dateEnd) {
      const start = new Date(dateStart);
      const end = new Date(dateEnd);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      setTripDuration(days > 0 ? days : null);
    } else {
      setTripDuration(null);
    }
  }, [dateStart, dateEnd]);

  // Disable past dates
  const disablePastDates = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Disable dates before start date for end date picker
  const disableBeforeStartDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    // Disable dates before start date if start date is selected
    if (dateStart) {
      const start = new Date(dateStart);
      return date < start;
    }

    return false;
  };

  return (
    <div className="space-y-4">
      <DatePickerField name="date_start" label="Start Date" disabled={disablePastDates} />

      <DatePickerField name="date_end" label="End Date" disabled={disableBeforeStartDate} />
    </div>
  );
}
