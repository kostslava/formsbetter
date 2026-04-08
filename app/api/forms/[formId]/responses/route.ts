import { createSupabaseServiceClient } from "@/lib/supabase";
import { jsonError, requireCreatorToken } from "@/lib/server-api";

export async function GET(
  request: Request,
  context: RouteContext<"/api/forms/[formId]/responses">
) {
  const creatorToken = requireCreatorToken(request);
  if (!creatorToken) {
    return jsonError("Missing creator token", 401);
  }

  const { formId } = await context.params;

  try {
    const supabase = createSupabaseServiceClient();

    const { data: form, error: formError } = await supabase
      .from("forms")
      .select("id, title, description, short_code, theme_id, fields, created_at")
      .eq("id", formId)
      .eq("creator_token", creatorToken)
      .maybeSingle();

    if (formError) {
      return jsonError(formError.message, 500);
    }

    if (!form) {
      return jsonError("Form not found for this creator token", 404);
    }

    const { data: responses, error: responseError } = await supabase
      .from("responses")
      .select("id, form_id, answers, created_at")
      .eq("form_id", formId)
      .order("created_at", { ascending: false });

    if (responseError) {
      return jsonError(responseError.message, 500);
    }

    return Response.json({ form, responses: responses ?? [] });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Server error", 500);
  }
}
