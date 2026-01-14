/**
 * CreatePlanForm - Main form component for plan creation
 *
 * Manages form state with react-hook-form and Zod validation
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { createPlanFormSchema } from "./validation";
import DestinationSection from "./DestinationSection";
import DateRangeSection from "./DateRangeSection";
import TravelNoteSection from "./TravelNoteSection";
import PreferencesSection from "./PreferencesSection";
import TransportSection from "./TransportSection";
import FormActions from "./FormActions";
import type { CreatePlanFormData } from "./types";
import type { CreatePlanDto } from "@/types";
import "./accessibility.css";

interface CreatePlanFormProps {
  defaultValues?: Partial<CreatePlanFormData>;
  isLoading: boolean;
  planCount: number;
  planLimit: number;
  onSubmit: (data: CreatePlanDto) => void;
  onCancel: () => void;
}

export default function CreatePlanForm({
  defaultValues,
  isLoading,
  planCount,
  planLimit,
  onSubmit,
  onCancel,
}: CreatePlanFormProps) {
  const form = useForm<CreatePlanFormData>({
    resolver: zodResolver(createPlanFormSchema),
    defaultValues: defaultValues || {
      destination_text: "",
      date_start: "",
      date_end: "",
      note_text: "",
      people_count: 2,
      trip_type: "leisure",
      comfort: "balanced",
      budget: "moderate",
      transport_modes: null,
    },
  });

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data);
  });

  const canSubmit = planCount < planLimit && !isLoading;
  const hasErrors = Object.keys(form.formState.errors).length > 0;

  return (
    <Card data-testid="create-plan-card">
      <CardHeader>
        <CardTitle data-testid="create-plan-card-title">Plan Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={handleSubmit}
            className="space-y-8"
            noValidate
            aria-label="Create travel plan form"
            data-testid="create-plan-form"
          >
            {/* Screen reader announcement for form errors */}
            {hasErrors && (
              <div role="alert" aria-live="polite" className="sr-only">
                There are {Object.keys(form.formState.errors).length} validation error(s) in the form. Please review and
                correct them.
              </div>
            )}
            {/* Destination */}
            <fieldset className="border-0 p-0 m-0 mb-4">
              <legend className="text-lg font-semibold mb-4">Destination</legend>
              <DestinationSection />
            </fieldset>

            {/* Date Range */}
            <fieldset className="border-0 p-0 m-0 mb-4">
              <legend className="text-lg font-semibold mb-4">Travel Dates</legend>
              <DateRangeSection />
            </fieldset>

            {/* Travel Preferences */}
            <fieldset className="border-0 p-0 m-0 mb-4">
              <legend className="text-lg font-semibold mb-4">Travel Preferences</legend>
              <PreferencesSection />
            </fieldset>

            {/* Transport Modes */}
            <fieldset className="border-0 p-0 m-0 mb-4">
              <legend className="text-lg font-semibold mb-4">Transport</legend>
              <TransportSection />
            </fieldset>

            {/* Travel Note */}
            <fieldset className="border-0 p-0 m-0 mb-4">
              <legend className="text-lg font-semibold mb-4">Additional Notes</legend>
              <TravelNoteSection />
            </fieldset>

            {/* Form Actions */}
            <div className="flex justify-end pt-4 border-t">
              <FormActions isSubmitting={isLoading} canSubmit={canSubmit} onCancel={onCancel} />
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
