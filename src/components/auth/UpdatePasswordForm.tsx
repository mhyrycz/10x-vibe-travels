/**
 * UpdatePasswordForm Component
 *
 * Allows users to set a new password after clicking the reset link from their email.
 * Validates password strength and confirmation.
 */

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface UpdatePasswordFormData {
  password: string;
  confirmPassword: string;
}

export default function UpdatePasswordForm() {
  const [formData, setFormData] = useState<UpdatePasswordFormData>({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof UpdatePasswordFormData, string>>>({});
  const [apiError, setApiError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resetCode, setResetCode] = useState<string | null>(null);

  // Extract code from URL query params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (!code) {
      setApiError("Invalid or missing reset code. Please use the link from your email.");
    } else {
      setResetCode(code);
    }
  }, []);

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

    if (!resetCode) {
      setApiError("Reset code is missing. Please use the link from your email.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: formData.password,
          code: resetCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError(data.error || "Failed to update password");
        return;
      }

      // Success - show confirmation message
      setIsSuccess(true);
    } catch {
      setApiError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
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
        <h1 className="text-3xl font-bold tracking-tight">Set New Password</h1>
        <p className="text-muted-foreground">Enter your new password below</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* API Error Alert */}
        {apiError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
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
              Updating password...
            </>
          ) : (
            "Update Password"
          )}
        </Button>
      </form>
    </div>
  );
}
