import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { CreatePlanFormData } from "./types";

interface DatePickerFieldProps {
  name: "date_start" | "date_end";
  label: string;
  disabled?: (date: Date) => boolean;
}

function DatePickerField({ name, label, disabled }: DatePickerFieldProps) {
  const form = useFormContext<CreatePlanFormData>();
  const [open, setOpen] = useState(false);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col" data-testid={`${name}-field`}>
          <FormLabel>{label}</FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                  data-testid={`${name}-button`}
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
                onSelect={(date) => {
                  field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                  setOpen(false); // Close popover after date selection
                }}
                disabled={disabled}
                initialFocus
                data-testid={`${name}-calendar`}
              />
            </PopoverContent>
          </Popover>
          <FormMessage data-testid={`${name}-error`} />
        </FormItem>
      )}
    />
  );
}

export default function DateRangeSection() {
  const form = useFormContext<CreatePlanFormData>();

  const dateStart = form.watch("date_start");

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
    <div className="space-y-4" data-testid="date-range-section">
      <DatePickerField name="date_start" label="Start Date" disabled={disablePastDates} />

      <DatePickerField name="date_end" label="End Date" disabled={disableBeforeStartDate} />
    </div>
  );
}
