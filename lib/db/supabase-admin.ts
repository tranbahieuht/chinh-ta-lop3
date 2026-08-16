import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error("Database chưa được cấu hình: cần NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY.");
  }
  adminClient ??= createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "chinh-ta-backend/1.0" } },
  });
  return adminClient;
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { error } = await getSupabaseAdmin().from("students").select("id").limit(1);
    if (error) {
      console.error("[chinh-ta/database-health]", { status: "failure", code: error.code ?? "QUERY_FAILED" });
      return false;
    }
    return true;
  } catch (reason) {
    console.error("[chinh-ta/database-health]", {
      status: "failure",
      reason: reason instanceof Error && /chưa được cấu hình/i.test(reason.message) ? "NOT_CONFIGURED" : "CONNECTION_FAILED",
    });
    return false;
  }
}
