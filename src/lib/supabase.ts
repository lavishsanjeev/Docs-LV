import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function createDynamicSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string
): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function validateSupabaseCredentials(
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<boolean> {
  try {
    const client = createDynamicSupabaseClient(supabaseUrl, supabaseAnonKey);
    // Try listing storage buckets as a simple validation
    const { error } = await client.storage.listBuckets();
    return !error;
  } catch {
    return false;
  }
}
