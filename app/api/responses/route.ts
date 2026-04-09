import { createSupabaseServiceClient } from "@/lib/supabase";
import { jsonError } from "@/lib/server-api";

const RESPONSE_META_KEY = "__formsbetter_meta__";

interface ResponseMeta {
  ip: string;
  location: string;
  browser: string;
  device: string;
  os: string;
  userAgent: string;
}

function browserFromUserAgent(userAgent: string): string {
  if (!userAgent) {
    return "Unknown";
  }

  if (/edg\//i.test(userAgent)) {
    return "Edge";
  }
  if (/opr\//i.test(userAgent)) {
    return "Opera";
  }
  if (/chrome\//i.test(userAgent) && !/edg\//i.test(userAgent)) {
    return "Chrome";
  }
  if (/firefox\//i.test(userAgent)) {
    return "Firefox";
  }
  if (/safari\//i.test(userAgent) && !/chrome\//i.test(userAgent)) {
    return "Safari";
  }

  return "Unknown";
}

function osFromUserAgent(userAgent: string): string {
  if (!userAgent) {
    return "Unknown";
  }

  if (/windows nt/i.test(userAgent)) {
    return "Windows";
  }
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return "iOS";
  }
  if (/android/i.test(userAgent)) {
    return "Android";
  }
  if (/mac os x|macintosh/i.test(userAgent)) {
    return "macOS";
  }
  if (/linux/i.test(userAgent)) {
    return "Linux";
  }

  return "Unknown";
}

function deviceFromUserAgent(userAgent: string): string {
  if (!userAgent) {
    return "Unknown";
  }

  if (/ipad|tablet/i.test(userAgent)) {
    return "Tablet";
  }
  if (/mobile|iphone|android/i.test(userAgent)) {
    return "Mobile";
  }

  return "Desktop";
}

function extractResponseMeta(headers: Headers): ResponseMeta {
  const forwarded = headers.get("x-forwarded-for") || "";
  const firstForwardedIp = forwarded.split(",")[0]?.trim();
  const ip =
    firstForwardedIp ||
    headers.get("x-real-ip") ||
    headers.get("x-vercel-forwarded-for") ||
    "Unavailable";

  const city = headers.get("x-vercel-ip-city") || "";
  const region = headers.get("x-vercel-ip-country-region") || headers.get("x-vercel-ip-region") || "";
  const country = headers.get("x-vercel-ip-country") || "";
  const location = [city, region, country].filter(Boolean).join(", ") || "Unavailable";

  const userAgent = headers.get("user-agent") || "";

  return {
    ip,
    location,
    browser: browserFromUserAgent(userAgent),
    device: deviceFromUserAgent(userAgent),
    os: osFromUserAgent(userAgent),
    userAgent: userAgent || "Unavailable",
  };
}

function isValidAnswerValue(value: unknown): boolean {
  if (typeof value === "string") {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every((item) => typeof item === "string");
  }

  return false;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON payload");
  }

  const payload = body as {
    formId?: string;
    answers?: Record<string, unknown>;
  };

  if (!payload.formId) {
    return jsonError("Missing form ID");
  }

  if (!payload.answers || typeof payload.answers !== "object") {
    return jsonError("Missing answers");
  }

  const invalidAnswer = Object.values(payload.answers).some((value) => !isValidAnswerValue(value));
  if (invalidAnswer) {
    return jsonError("Invalid answer value format");
  }

  const answersWithoutMeta = { ...payload.answers };
  delete answersWithoutMeta[RESPONSE_META_KEY];

  const responseMeta = extractResponseMeta(request.headers);
  const answersWithMeta = {
    ...answersWithoutMeta,
    [RESPONSE_META_KEY]: JSON.stringify(responseMeta),
  };

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
      answers: answersWithMeta,
    });

    if (error) {
      return jsonError(error.message, 500);
    }

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Server error", 500);
  }
}
