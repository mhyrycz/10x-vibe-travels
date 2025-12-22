import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Edit, RefreshCw, Trash2 } from "lucide-react";

interface PlanHeaderProps {
  planName: string;
  onEditClick: () => void;
  onRegenerateClick: () => void;
  onDeleteClick: () => void;
}

export function PlanHeader({ planName, onEditClick, onRegenerateClick, onDeleteClick }: PlanHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">My Plans</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{planName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-3xl font-bold tracking-tight">{planName}</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onEditClick}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Plan
        </Button>
        <Button variant="outline" size="sm" onClick={onRegenerateClick}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Regenerate
        </Button>
        <Button variant="destructive" size="sm" onClick={onDeleteClick}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
