/**
 * PageHeader - Breadcrumb navigation and page heading
 */

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function PageHeader() {
  return (
    <div className="mb-6 space-y-2" data-testid="create-plan-header">
      <Breadcrumb aria-label="Breadcrumb navigation" data-testid="create-plan-breadcrumb">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/">My Plans</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>New Plan</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-3xl font-bold tracking-tight" data-testid="create-plan-heading">
        Create New Travel Plan
      </h1>
    </div>
  );
}
