import { nanoid } from "nanoid";
import { createSupabaseServiceClient } from "@/lib/supabase";
import {
  isValidFieldArray,
  jsonError,
  normalizeTheme,
  requireFirebaseUserId,
  SHORT_CODE_LENGTH,
} from "@/lib/server-api";

export async function GET(request: Request) {
  const creatorUid = await requireFirebaseUserId(request);
  if (!creatorUid) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const supabase = createSupabaseServiceClient();

    const { data, error } = await supabase
      .from("forms")
      .select("id, title, description, short_code, theme_id, created_at")
      .eq("creator_token", creatorUid)
      .order("created_at", { ascending: false });

    if (error) {
      return jsonError(error.message, 500);
    }

    return Response.json({ forms: data ?? [] });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Server error", 500);
  }
}

export async function POST(request: Request) {
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
  };

  const creatorUid = await requireFirebaseUserId(request);
  if (!creatorUid) {
    return jsonError("Unauthorized", 401);
  }

  if (!payload.title || payload.title.trim().length < 2) {
    return jsonError("Form title is too short");
  }

  if (!isValidFieldArray(payload.fields)) {
    return jsonError("Form must contain at least one valid field");
  }

  const themeId = normalizeTheme(payload.themeId);

  try {
    const supabase = createSupabaseServiceClient();

    let shortCode = "";

    for (let i = 0; i < 5; i += 1) {
      const candidate = nanoid(SHORT_CODE_LENGTH);
      const { data } = await supabase
        .from("forms")
        .select("id")
        .eq("short_code", candidate)
        .maybeSingle();

      if (!data) {
        shortCode = candidate;
        break;
      }
    }

    if (!shortCode) {
      return jsonError("Could not generate short URL. Try again.", 500);
    }

    const { data: form, error } = await supabase
      .from("forms")
      .insert({
        title: payload.title.trim(),
        description: payload.description?.trim() ?? "",
        theme_id: themeId,
        fields: payload.fields,
        short_code: shortCode,
        creator_token: creatorUid,
      })
      .select("id, short_code")
      .single();

    if (error || !form) {
      return jsonError(error?.message ?? "Could not save form", 500);
    }

    return Response.json({ form }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Server error", 500);
  }
}
