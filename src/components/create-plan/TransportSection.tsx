/**
 * TransportSection - Transport mode preferences
 * Checkbox group for selecting preferred transport modes
 */

import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useFormContext } from "react-hook-form";
import type { CreatePlanFormData } from "./types";

const transportOptions = [
  { value: "car" as const, label: "Car", description: "Private vehicle or rental" },
  { value: "walk" as const, label: "Walking", description: "On foot exploration" },
  { value: "public" as const, label: "Public Transport", description: "Bus, train, metro, etc." },
];

export default function TransportSection() {
  const form = useFormContext<CreatePlanFormData>();

  return (
    <FormField
      control={form.control}
      name="transport_modes"
      render={() => (
        <FormItem data-testid="transport-section">
          <div className="mb-4">
            <FormLabel>Preferred Transport Modes</FormLabel>
            <FormDescription>Select all that apply (optional)</FormDescription>
          </div>
          <div className="space-y-3">
            {transportOptions.map((option) => (
              <FormField
                key={option.value}
                control={form.control}
                name="transport_modes"
                render={({ field }) => {
                  const currentValue = field.value || [];
                  return (
                    <FormItem
                      className="flex flex-row items-start space-x-3 space-y-0"
                      data-testid={`transport-${option.value}-field`}
                    >
                      <FormControl>
                        <Checkbox
                          checked={currentValue.includes(option.value)}
                          onCheckedChange={(checked) => {
                            const updatedValue = checked
                              ? [...currentValue, option.value]
                              : currentValue.filter((value) => value !== option.value);
                            field.onChange(updatedValue.length > 0 ? updatedValue : null);
                          }}
                          data-testid={`transport-${option.value}-checkbox`}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal cursor-pointer">{option.label}</FormLabel>
                        <FormDescription>{option.description}</FormDescription>
                      </div>
                    </FormItem>
                  );
                }}
              />
            ))}
          </div>
          <FormMessage data-testid="transport-error" />
        </FormItem>
      )}
    />
  );
}
