/**
 * CreatePlanView - Main orchestrator component for plan creation
 *
 * Responsibilities:
 * - Fetch user preferences and plan count on mount
 * - Manage overall view state and loading states
 * - Coordinate between form, alerts, and loading overlay
 * - Handle navigation after successful plan creation
 */

import { useEffect } from "react";
import { useNavigate } from "@/lib/navigation";
import PageHeader from "./PageHeader";
import PlanLimitAlert from "./PlanLimitAlert";
import CreatePlanForm from "./CreatePlanForm";
import LoadingOverlay from "./LoadingOverlay";
import FormSkeleton from "./FormSkeleton";
import { useUserPreferences, usePlanCount, useCreatePlan } from "./hooks/useCreatePlanMutations";
import type { CreatePlanDto } from "@/types";

const PLAN_LIMIT = 10;

export default function CreatePlanView() {
  const navigate = useNavigate();

  // Fetch user preferences for pre-filling form
  const { data: userPreferences, isLoading: isLoadingPreferences } = useUserPreferences();

  // Fetch plan count to check limit
  const { data: planCount = 0, isLoading: isLoadingPlanCount } = usePlanCount();

  // Create plan mutation
  const createPlanMutation = useCreatePlan();

  // Derived state
  const canCreatePlan = planCount < PLAN_LIMIT;
  const isCreatingPlan = createPlanMutation.isPending;

  // Handle successful plan creation
  useEffect(() => {
    if (createPlanMutation.isSuccess && createPlanMutation.data) {
      // Navigate to the new plan detail page
      navigate(`/plans/${createPlanMutation.data.id}`);
    }
  }, [createPlanMutation.isSuccess, createPlanMutation.data, navigate]);

  // Handle form submission
  const handleSubmit = async (data: CreatePlanDto) => {
    if (!canCreatePlan) {
      return;
    }
    createPlanMutation.mutate(data);
  };

  // Handle form cancellation
  const handleCancel = () => {
    navigate("/");
  };

  // Prepare default form values from user preferences
  const defaultFormValues =
    userPreferences && !isLoadingPreferences
      ? {
          destination_text: "",
          date_start: "",
          date_end: "",
          note_text: "",
          people_count: userPreferences.people_count,
          trip_type: userPreferences.trip_type,
          comfort: userPreferences.comfort,
          budget: userPreferences.budget,
          transport_modes: null as ("car" | "walk" | "public")[] | null,
        }
      : undefined;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-6 md:py-8">
        <PageHeader />

        {/* Plan Limit Alert */}
        {!isLoadingPlanCount && !canCreatePlan && (
          <div className="mb-6">
            <PlanLimitAlert isVisible={true} planLimit={PLAN_LIMIT} />
          </div>
        )}

        {/* Main Form - Show skeleton while loading preferences */}
        {isLoadingPreferences ? (
          <FormSkeleton />
        ) : (
          <CreatePlanForm
            defaultValues={defaultFormValues}
            isLoading={isCreatingPlan}
            planCount={planCount}
            planLimit={PLAN_LIMIT}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        )}

        {/* Loading Overlay during AI generation */}
        <LoadingOverlay isVisible={isCreatingPlan} />
      </div>
    </div>
  );
}
