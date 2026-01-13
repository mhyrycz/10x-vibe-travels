/**
 * PreferencesForm component
 * Main form component using react-hook-form and Zod validation
 * Orchestrates all form fields, manages form state, handles validation errors,
 * and coordinates submission with the API mutation hook
 */

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { preferencesFormSchema, type PreferencesFormValues } from "./validation";
import { useCreateUserPreferences } from "./hooks/useCreateUserPreferences";
import FormActions from "./FormActions";
import PeopleCountField from "./PeopleCountField";
import TripTypeField from "./TripTypeField";
import AgeField from "./AgeField";
import CountryField from "./CountryField";
import ComfortField from "./ComfortField";
import BudgetField from "./BudgetField";

/**
 * Main preferences form with validation and API integration
 */
export default function PreferencesForm() {
  const mutation = useCreateUserPreferences();

  // Initialize form with react-hook-form and Zod validation
  const form = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: {
      people_count: 2, // Sensible default
      trip_type: undefined, // Force user selection
      age: undefined, // Force user input
      country: "", // Empty default
      comfort: undefined, // Force user selection
      budget: undefined, // Force user selection
    },
    mode: "onBlur", // Validate on blur for better UX
  });

  // Handle form submission
  const onSubmit = (data: PreferencesFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" aria-label="Travel preferences form" data-testid="preferences-form">
        <PeopleCountField />

        <TripTypeField />

        <AgeField />

        <CountryField />

        <ComfortField />

        <BudgetField />

        <FormActions isLoading={mutation.isPending} />
      </form>
    </Form>
  );
}
