import { createSupabaseServiceClient } from "@/lib/supabase";
import { jsonError } from "@/lib/server-api";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON payload");
  }

  const payload = body as {
    formId?: string;
    answers?: Record<string, string>;
  };

  if (!payload.formId) {
    return jsonError("Missing form ID");
  }

  if (!payload.answers || typeof payload.answers !== "object") {
    return jsonError("Missing answers");
  }

  try {
    const supabase = createSupabaseServiceClient();

    const { data: form, error: formError } = await supabase
      .from("forms")
      .select("id")
      .eq("id", payload.formId)
      .maybeSingle();

    if (formError) {
      return jsonError(formError.message, 500);
    }

    if (!form) {
      return jsonError("Form not found", 404);
    }

    const { error } = await supabase.from("responses").insert({
      form_id: payload.formId,
      answers: payload.answers,
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Server error", 500);
  }
}
