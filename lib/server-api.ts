import { FormField, FormThemeId } from "@/lib/types";
import { verifyFirebaseIdToken } from "@/lib/firebase-server";

export const SHORT_CODE_LENGTH = 7;

export function jsonError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export async function requireFirebaseUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return verifyFirebaseIdToken(token);
}

export function normalizeTheme(themeId: string | undefined): FormThemeId {
  if (
    themeId === "orchid" ||
    themeId === "ocean" ||
    themeId === "sunset" ||
    themeId === "midnight" ||
    themeId === "lagoon" ||
    themeId === "dune"
  ) {
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
