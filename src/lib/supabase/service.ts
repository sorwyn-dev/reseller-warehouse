import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/client";

export function createServiceClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase не настроен");
  }

  return createClient(getSupabaseUrl()!, getSupabaseKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
