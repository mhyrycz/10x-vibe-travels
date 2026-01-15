/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types";

interface CloudflareRuntime {
  env: {
    SUPABASE_URL: string;
    SUPABASE_KEY: string;
    OPENROUTER_API_KEY: string;
    OPENROUTER_BASE_URL?: string;
    USE_MOCK_AI?: string;
  };
}

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user: {
        id: string;
        email: string | undefined;
      } | null;
      runtime?: CloudflareRuntime;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly OPENROUTER_BASE_URL?: string;
  readonly USE_MOCK_AI?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
