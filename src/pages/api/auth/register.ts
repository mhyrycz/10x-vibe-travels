import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { z } from "zod";

export const prerender = false;

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    // eslint-disable-next-line no-useless-escape
    .regex(/[!@#$%^&*()_+=\[\]{};':"\\|,.<>?-]/, "Password must contain at least one special character"),
});

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const body = await request.json();

    // Validate input
    const validation = registerSchema.safeParse(body);
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

    const { email, password } = validation.data;

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
      runtime: locals.runtime,
    });

    // Sign up with auto-confirm (Option B - skip email verification for MVP)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${new URL(request.url).origin}/onboarding/preferences`,
      },
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
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
        message: "Registration successful. You can now log in.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
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
