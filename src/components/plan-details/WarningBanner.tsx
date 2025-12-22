import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface WarningBannerProps {
  warnings: string[];
}

export function WarningBanner({ warnings }: WarningBannerProps) {
  if (warnings.length === 0) return null;

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Schedule Warnings</AlertTitle>
      <AlertDescription>
        {warnings.length === 1 ? (
          <p>{warnings[0]}</p>
        ) : (
          <ul className="ml-4 list-disc space-y-1">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
}
