import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-center"
      expand={false}
      richColors={false}
      closeButton={false}
      offset={16}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: "flex items-center gap-3 rounded-lg border bg-white p-4 shadow-lg",
          title: "text-sm font-medium text-gray-900",
          description: "text-sm text-gray-600",
          actionButton: "rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700",
          cancelButton: "rounded bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300",
          closeButton: "rounded-full p-1 hover:bg-gray-100",
          success: "border-green-200 bg-white",
          error: "border-red-200 bg-white",
          warning: "border-amber-200 bg-white",
          info: "border-blue-200 bg-white",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
