import { FormField, FormThemeId } from "@/lib/types";

export const SHORT_CODE_LENGTH = 7;

export function jsonError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export function requireCreatorToken(request: Request): string | null {
  const token = request.headers.get("x-creator-token");
  if (!token || token.trim().length < 16) {
    return null;
  }
  return token;
}

export function normalizeTheme(themeId: string | undefined): FormThemeId {
  if (themeId === "ocean" || themeId === "sunset" || themeId === "orchid") {
    return themeId;
  }
  return "orchid";
}

export function isValidFieldArray(fields: unknown): fields is FormField[] {
  if (!Array.isArray(fields) || fields.length === 0) {
    return false;
  }

  return fields.every((field) => {
    if (!field || typeof field !== "object") {
      return false;
    }

    const f = field as Partial<FormField>;

    if (!f.id || !f.label || typeof f.id !== "string" || typeof f.label !== "string") {
      return false;
    }

    if (
      f.type !== "short_text" &&
      f.type !== "paragraph" &&
      f.type !== "image"
    ) {
      return false;
    }

    if (typeof f.required !== "boolean") {
      return false;
    }

    if (f.type === "image" && (!f.imageUrl || typeof f.imageUrl !== "string")) {
      return false;
    }

    return true;
  });
}
