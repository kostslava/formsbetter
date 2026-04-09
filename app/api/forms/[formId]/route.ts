import { enrichFieldsWithSections } from "@/lib/form-sections";
import { createSupabaseServiceClient } from "@/lib/supabase";
import {
  isValidFieldArray,
  isValidSectionArray,
  jsonError,
  normalizeTheme,
  requireFirebaseUserId,
} from "@/lib/server-api";

export async function GET(
  request: Request,
  context: RouteContext<"/api/forms/[formId]">
) {
  const creatorUid = await requireFirebaseUserId(request);
  if (!creatorUid) {
    return jsonError("Unauthorized", 401);
  }

  const { formId } = await context.params;

  try {
    const supabase = createSupabaseServiceClient();

    const { data: form, error } = await supabase
      .from("forms")
      .select("id, title, description, short_code, theme_id, fields, created_at")
      .eq("id", formId)
      .eq("creator_token", creatorUid)
      .maybeSingle();

    if (error) {
      return jsonError(error.message, 500);
    }

    if (!form) {
      return jsonError("Form not found", 404);
    }

    return Response.json({ form });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Server error", 500);
  }
}

export async function PUT(
  request: Request,
  context: RouteContext<"/api/forms/[formId]">
) {
  const creatorUid = await requireFirebaseUserId(request);
  if (!creatorUid) {
    return jsonError("Unauthorized", 401);
  }

  const { formId } = await context.params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON payload");
  }

  const payload = body as {
    title?: string;
    description?: string;
    themeId?: string;
    fields?: unknown;
    sections?: unknown;
  };

  if (!payload.title || payload.title.trim().length < 2) {
    return jsonError("Form title is too short");
  }

  if (!isValidFieldArray(payload.fields)) {
    return jsonError("Form must contain at least one valid field");
  }

  if (!isValidSectionArray(payload.sections)) {
    return jsonError("Form must contain at least one valid section");
  }

  const sectionIds = new Set(payload.sections.map((section) => section.id));
  const fieldsWithoutSection = payload.fields.filter(
    (field) => !field.sectionId || !sectionIds.has(field.sectionId)
  );

  if (fieldsWithoutSection.length > 0) {
    return jsonError("Each field must belong to an existing section");
  }

  const themeId = normalizeTheme(payload.themeId);
  const enrichedFields = enrichFieldsWithSections(payload.fields, payload.sections);

  try {
    const supabase = createSupabaseServiceClient();

    const { data: form, error } = await supabase
      .from("forms")
      .update({
        title: payload.title.trim(),
        description: payload.description?.trim() ?? "",
        theme_id: themeId,
        fields: enrichedFields,
      })
      .eq("id", formId)
      .eq("creator_token", creatorUid)
      .select("id, short_code")
      .maybeSingle();

    if (error) {
      return jsonError(error.message, 500);
    }

    if (!form) {
      return jsonError("Form not found", 404);
    }

    return Response.json({ form });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Server error", 500);
  }
}
