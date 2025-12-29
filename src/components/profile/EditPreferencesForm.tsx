/**
 * Edit Preferences Form Component
 * Main form for editing user travel preferences
 * Pre-fills with current data and submits only changed fields
 */

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { preferencesFormSchema } from "../../components/onboarding/validation";
import type { PreferencesFormValues } from "../../components/onboarding/validation";
import type { UserPreferencesDto, UpdateUserPreferencesDto } from "../../types";
import { useUpdateUserPreferences } from "./hooks/useUpdateUserPreferences";
import { Form } from "../../components/ui/form";
import PeopleCountField from "../../components/onboarding/PeopleCountField";
import TripTypeField from "../../components/onboarding/TripTypeField";
import AgeField from "../../components/onboarding/AgeField";
import CountryField from "../../components/onboarding/CountryField";
import ComfortField from "../../components/onboarding/ComfortField";
import BudgetField from "../../components/onboarding/BudgetField";
import FormActions from "./FormActions";

interface EditPreferencesFormProps {
  initialData: UserPreferencesDto;
}

export default function EditPreferencesForm({ initialData }: EditPreferencesFormProps) {
  const mutation = useUpdateUserPreferences();

  const form = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesFormSchema),
    defaultValues: {
      people_count: initialData.people_count,
      trip_type: initialData.trip_type,
      age: initialData.age,
      country: initialData.country,
      comfort: initialData.comfort,
      budget: initialData.budget,
    },
    mode: "onBlur",
  });

  // Reset form with updated values after successful mutation
  // This clears the dirty state and updates form to match new cache data
  React.useEffect(() => {
    if (mutation.isSuccess && mutation.data) {
      form.reset({
        people_count: mutation.data.people_count,
        trip_type: mutation.data.trip_type,
        age: mutation.data.age,
        country: mutation.data.country,
        comfort: mutation.data.comfort,
        budget: mutation.data.budget,
      });
    }
  }, [mutation.isSuccess, mutation.data, form]);

  const onSubmit = (formValues: PreferencesFormValues) => {
    // Get dirty fields from react-hook-form
    const dirtyFields = form.formState.dirtyFields;

    // Build update object with only changed fields
    const updateData: UpdateUserPreferencesDto = {};

    if (dirtyFields.people_count) updateData.people_count = formValues.people_count;
    if (dirtyFields.trip_type) updateData.trip_type = formValues.trip_type;
    if (dirtyFields.age) updateData.age = formValues.age;
    if (dirtyFields.country) updateData.country = formValues.country;
    if (dirtyFields.comfort) updateData.comfort = formValues.comfort;
    if (dirtyFields.budget) updateData.budget = formValues.budget;

    // Submit only changed fields
    mutation.mutate(updateData);
  };

  const handleCancel = () => {
    if (form.formState.isDirty) {
      const confirmed = window.confirm("You have unsaved changes. Are you sure you want to cancel?");
      if (!confirmed) return;
    }
    // Navigate back to previous page or home
    window.history.back();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <PeopleCountField />
        <TripTypeField />
        <AgeField />
        <CountryField />
        <ComfortField />
        <BudgetField />
        <FormActions
          isLoading={mutation.isPending}
          isDirty={form.formState.isDirty}
          isValid={form.formState.isValid}
          onCancel={handleCancel}
        />
      </form>
    </Form>
  );
}
