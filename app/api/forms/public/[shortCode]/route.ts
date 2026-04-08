import { createSupabaseServiceClient } from "@/lib/supabase";
import { jsonError } from "@/lib/server-api";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/forms/public/[shortCode]">
) {
  const { shortCode } = await context.params;

  try {
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from("forms")
      .select("id, title, description, short_code, theme_id, fields, sections, created_at")
      .eq("short_code", shortCode)
      .maybeSingle();

    if (error) {
      return jsonError(error.message, 500);
    }

    if (!data) {
      return jsonError("Form not found", 404);
    }

    return Response.json({ form: data });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Server error", 500);
  }
}
