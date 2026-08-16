import { checkDatabaseConnection } from "@/lib/db/supabase-admin";
import { hasDialogflowEnvironment } from "@/lib/dialogflow/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const database = await checkDatabaseConnection();
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
  const dialogflowConfigured = hasDialogflowEnvironment();
  return Response.json({
    ok: database && dialogflowConfigured,
    database,
    geminiConfigured,
    dialogflowConfigured,
    timestamp: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
