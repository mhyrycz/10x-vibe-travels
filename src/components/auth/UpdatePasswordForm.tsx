/**
 * UpdatePasswordForm Component
 *
 * Allows users to:
 * 1. Set a new password after clicking the reset link from their email (with reset code)
 * 2. Change password when authenticated in settings page (without reset code)
 *
 * Validates password strength and confirmation.
 */

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface UpdatePasswordFormData {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}

interface UpdatePasswordFormProps {
  /** If true, shows current password field and doesn't require reset code */
  isAuthenticatedMode?: boolean;
}

export default function UpdatePasswordForm({ isAuthenticatedMode = false }: UpdatePasswordFormProps) {
  const [formData, setFormData] = useState<UpdatePasswordFormData>({
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof UpdatePasswordFormData, string>>>({});
  const [apiError, setApiError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resetCode, setResetCode] = useState<string | null>(null);

  // Extract code from URL query params (only for password reset flow)
  useEffect(() => {
    if (!isAuthenticatedMode) {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      if (!code) {
        setApiError("Invalid or missing reset code. Please use the link from your email.");
      } else {
        setResetCode(code);
      }
    }
  }, [isAuthenticatedMode]);

  // Validate password strength
  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (password.length < 10) {
      errors.push("At least 10 characters");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("One uppercase letter");
    }
    // eslint-disable-next-line no-useless-escape
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("One special character");
    }

    return { isValid: errors.length === 0, errors };
  };

  // Handle input change
  const handleChange = useCallback((field: keyof UpdatePasswordFormData) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear field error on change
      setErrors((prev) => ({ ...prev, [field]: "" }));
      setApiError("");
    };
  }, []);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UpdatePasswordFormData, string>> = {};

    // Validate current password only in authenticated mode
    if (isAuthenticatedMode && !formData.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = `Password must contain: ${passwordValidation.errors.join(", ")}`;
      }
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");

    // Validate reset code only for password reset flow
    if (!isAuthenticatedMode && !resetCode) {
      setApiError("Reset code is missing. Please use the link from your email.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody: Record<string, string> = {
        password: formData.password,
      };

      // Add code for password reset flow
      if (!isAuthenticatedMode && resetCode) {
        requestBody.code = resetCode;
      }

      // Add current password for authenticated user flow
      if (isAuthenticatedMode) {
        requestBody.currentPassword = formData.currentPassword;
      }

      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError(data.error || "Failed to update password");
        return;
      }

      // Success - show toast in authenticated mode, confirmation page in reset mode
      if (isAuthenticatedMode) {
        toast.success("Password changed successfully");
        // Reset form
        setFormData({
          currentPassword: "",
          password: "",
          confirmPassword: "",
        });
      } else {
        setIsSuccess(true);
      }
    } catch {
      setApiError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state (only for password reset flow)
  if (isSuccess) {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Password Updated</h1>
          <p className="text-muted-foreground">
            Your password has been successfully updated. You can now log in with your new password.
          </p>
        </div>
        <Button asChild className="w-full">
          <a href="/login">Go to Login</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          {isAuthenticatedMode ? "Change Password" : "Set New Password"}
        </h1>
        <p className="text-muted-foreground">
          {isAuthenticatedMode ? "Update your account password" : "Enter your new password below"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* API Error Alert */}
        {apiError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        {/* Current Password Field (only in authenticated mode) */}
        {isAuthenticatedMode && (
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="Enter your current password"
              value={formData.currentPassword}
              onChange={handleChange("currentPassword")}
              aria-invalid={!!errors.currentPassword}
              disabled={isSubmitting}
            />
            {errors.currentPassword && <p className="text-sm text-destructive">{errors.currentPassword}</p>}
          </div>
        )}

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Create a strong password"
            value={formData.password}
            onChange={handleChange("password")}
            aria-invalid={!!errors.password}
            disabled={isSubmitting}
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          <p className="text-xs text-muted-foreground">
            Minimum 10 characters, one uppercase letter, and one special character
          </p>
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repeat your new password"
            value={formData.confirmPassword}
            onChange={handleChange("confirmPassword")}
            aria-invalid={!!errors.confirmPassword}
            disabled={isSubmitting}
          />
          {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isAuthenticatedMode ? "Changing password..." : "Updating password..."}
            </>
          ) : isAuthenticatedMode ? (
            "Change Password"
          ) : (
            "Update Password"
          )}
        </Button>
      </form>
    </div>
  );
}
