import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { auth } from "@/lib/firebase/config";

let client: SupabaseClient | null = null;

/** Browser client that identifies the user to Postgres with their Firebase ID token (design D7). */
export function createClient(): SupabaseClient {
  if (!client) {
    client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "example-anon-key",
      { accessToken: async () => (await auth.currentUser?.getIdToken()) ?? null },
    );
  }
  return client;
}
