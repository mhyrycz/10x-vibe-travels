/**
 * RegisterForm Component
 *
 * Renders the registration form with email, password, and password confirmation.
 * Handles client-side validation including password strength requirements.
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterForm() {
  const [formData, setFormData] = useState<RegisterFormData>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});
  const [apiError, setApiError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate password strength
  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (password.length < 10) {
      errors.push("At least 10 characters");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("One uppercase letter");
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("One special character");
    }

    return { isValid: errors.length === 0, errors };
  };

  // Handle input change
  const handleChange = useCallback((field: keyof RegisterFormData) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear field error on change
      setErrors((prev) => ({ ...prev, [field]: "" }));
      setApiError("");
    };
  }, []);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof RegisterFormData, string>> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
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

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError(data.error || "Registration failed");
        return;
      }

      // Success - show confirmation message and redirect to login
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
          <h1 className="text-3xl font-bold tracking-tight">Check Your Email</h1>
          <p className="text-muted-foreground">
            We&apos;ve sent a confirmation link to <strong>{formData.email}</strong>. Please check your inbox and click
            the link to activate your account.
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
        <h1 className="text-3xl font-bold tracking-tight">Create Account</h1>
        <p className="text-muted-foreground">Enter your details to get started</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* API Error Alert */}
        {apiError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            value={formData.email}
            onChange={handleChange("email")}
            aria-invalid={!!errors.email}
            disabled={isSubmitting}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
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
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repeat your password"
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
              Creating account...
            </>
          ) : (
            "Sign Up"
          )}
        </Button>

        {/* Login Link */}
        <div className="text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <a
            href="/login"
            className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
          >
            Log in
          </a>
        </div>
      </form>
    </div>
  );
}
