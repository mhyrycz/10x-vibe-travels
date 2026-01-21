import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { z } from "zod";

export const prerender = false;

// Shared password validation schema
const passwordValidation = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  // eslint-disable-next-line no-useless-escape
  .regex(/[!@#$%^&*()_+=\[\]{};':"\\|,.<>?-]/, "Password must contain at least one special character");

// Schema for password reset flow (with code)
const passwordResetSchema = z.object({
  password: passwordValidation,
  code: z.string().min(1, "Reset code is required"),
});

// Schema for authenticated password change (with current password)
const passwordChangeSchema = z.object({
  password: passwordValidation,
  currentPassword: z.string().min(1, "Current password is required"),
});

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const body = await request.json();

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Determine which flow based on presence of 'code' or 'currentPassword'
    const isPasswordReset = "code" in body;
    const isPasswordChange = "currentPassword" in body;

    if (isPasswordReset) {
      // Password Reset Flow (with reset code from email)
      const validation = passwordResetSchema.safeParse(body);
      if (!validation.success) {
        return new Response(
          JSON.stringify({
            error: validation.error.errors[0]?.message || "Invalid input",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const { password, code } = validation.data;

      // Exchange the code for a session
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        return new Response(
          JSON.stringify({
            error: "Invalid or expired reset code. Please request a new password reset link.",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Update password - user is now authenticated via reset token
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        return new Response(
          JSON.stringify({
            error: error.message,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          message: "Password updated successfully",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else if (isPasswordChange) {
      // Password Change Flow (authenticated user changing password)
      const validation = passwordChangeSchema.safeParse(body);
      if (!validation.success) {
        return new Response(
          JSON.stringify({
            error: validation.error.errors[0]?.message || "Invalid input",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const { password, currentPassword } = validation.data;

      // Check if user is authenticated
      if (!locals.user) {
        return new Response(
          JSON.stringify({
            error: "You must be logged in to change your password",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: locals.user.email || "",
        password: currentPassword,
      });

      if (signInError) {
        return new Response(
          JSON.stringify({
            error: "Current password is incorrect",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Update to new password
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        return new Response(
          JSON.stringify({
            error: error.message,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          message: "Password changed successfully",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      // Neither code nor currentPassword provided
      return new Response(
        JSON.stringify({
          error: "Either reset code or current password is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch {
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
