import { FormField, FormSection, FormThemeId } from "@/lib/types";
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
      f.type !== "image" &&
      f.type !== "multiple_choice" &&
      f.type !== "checkbox" &&
      f.type !== "rating"
    ) {
      return false;
    }

    if (typeof f.required !== "boolean") {
      return false;
    }

    if (f.type === "image" && (!f.imageUrl || typeof f.imageUrl !== "string")) {
      return false;
    }

    if ((f.type === "multiple_choice" || f.type === "checkbox") && !Array.isArray(f.options)) {
      return false;
    }

    if ((f.type === "multiple_choice" || f.type === "checkbox") && Array.isArray(f.options)) {
      if (f.options.length < 2) {
        return false;
      }

      if (f.options.some((option) => typeof option !== "string" || option.trim().length === 0)) {
        return false;
      }
    }

    if (f.type === "checkbox") {
      if (
        f.minSelections !== undefined &&
        (!Number.isInteger(f.minSelections) || f.minSelections < 0)
      ) {
        return false;
      }

      if (
        f.maxSelections !== undefined &&
        (!Number.isInteger(f.maxSelections) || f.maxSelections < 1)
      ) {
        return false;
      }

      if (
        f.minSelections !== undefined &&
        f.maxSelections !== undefined &&
        f.minSelections > f.maxSelections
      ) {
        return false;
      }
    }

    if (
      f.type === "rating" &&
      (f.maxRating === undefined || !Number.isInteger(f.maxRating) || f.maxRating < 2 || f.maxRating > 10)
    ) {
      return false;
    }

    return true;
  });
}

export function isValidSectionArray(sections: unknown): sections is FormSection[] {
  if (!Array.isArray(sections) || sections.length === 0) {
    return false;
  }

  return sections.every((section) => {
    if (!section || typeof section !== "object") {
      return false;
    }

    const value = section as Partial<FormSection>;

    return (
      typeof value.id === "string" &&
      value.id.trim().length > 0 &&
      typeof value.title === "string" &&
      value.title.trim().length > 0 &&
      (value.description === undefined || typeof value.description === "string")
    );
  });
}
