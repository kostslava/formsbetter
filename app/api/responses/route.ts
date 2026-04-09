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
  language: string;
  languages: string[];
  timezone: string;
  platform: string;
  screenResolution: string;
  viewport: string;
  colorScheme: string;
  prefersReducedMotion: string;
  deviceMemoryGb: number | null;
  cpuCores: number | null;
  maxTouchPoints: number | null;
  connectionType: string;
  effectiveConnectionType: string;
  downlinkMbps: number | null;
  roundTripTimeMs: number | null;
  saveData: string;
  uaBrands: string;
  uaMobile: string;
  uaPlatform: string;
}

interface ClientAnalyticsInput {
  language?: unknown;
  languages?: unknown;
  timezone?: unknown;
  platform?: unknown;
  screenResolution?: unknown;
  viewport?: unknown;
  colorScheme?: unknown;
  prefersReducedMotion?: unknown;
  deviceMemoryGb?: unknown;
  cpuCores?: unknown;
  maxTouchPoints?: unknown;
  connectionType?: unknown;
  effectiveConnectionType?: unknown;
  downlinkMbps?: unknown;
  roundTripTimeMs?: unknown;
  saveData?: unknown;
  uaBrands?: unknown;
  uaMobile?: unknown;
  uaPlatform?: unknown;
}

interface SanitizedClientAnalytics {
  language: string;
  languages: string[];
  timezone: string;
  platform: string;
  screenResolution: string;
  viewport: string;
  colorScheme: string;
  prefersReducedMotion: string;
  deviceMemoryGb: number | null;
  cpuCores: number | null;
  maxTouchPoints: number | null;
  connectionType: string;
  effectiveConnectionType: string;
  downlinkMbps: number | null;
  roundTripTimeMs: number | null;
  saveData: string;
  uaBrands: string;
  uaMobile: string;
  uaPlatform: string;
}

const UNAVAILABLE = "Unavailable";

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

function normalizeString(value: unknown, fallback = UNAVAILABLE, maxLength = 120): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return fallback;
  }

  return trimmed.slice(0, maxLength);
}

function normalizeStringArray(
  value: unknown,
  maxItems = 8,
  maxLength = 40
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, maxItems)
    .map((item) => item.slice(0, maxLength));
}

function normalizeNumber(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  if (value < min || value > max) {
    return null;
  }

  return value;
}

function normalizeBooleanLabel(value: unknown): string {
  if (typeof value !== "boolean") {
    return UNAVAILABLE;
  }

  return value ? "Yes" : "No";
}

function sanitizeClientAnalytics(clientAnalytics: unknown): SanitizedClientAnalytics {
  const value =
    clientAnalytics && typeof clientAnalytics === "object"
      ? (clientAnalytics as ClientAnalyticsInput)
      : ({} as ClientAnalyticsInput);

  return {
    language: normalizeString(value.language, UNAVAILABLE, 24),
    languages: normalizeStringArray(value.languages),
    timezone: normalizeString(value.timezone, UNAVAILABLE, 60),
    platform: normalizeString(value.platform),
    screenResolution: normalizeString(value.screenResolution, UNAVAILABLE, 30),
    viewport: normalizeString(value.viewport, UNAVAILABLE, 30),
    colorScheme: normalizeString(value.colorScheme, UNAVAILABLE, 16),
    prefersReducedMotion: normalizeBooleanLabel(value.prefersReducedMotion),
    deviceMemoryGb: normalizeNumber(value.deviceMemoryGb, 0.25, 4096),
    cpuCores: normalizeNumber(value.cpuCores, 1, 512),
    maxTouchPoints: normalizeNumber(value.maxTouchPoints, 0, 20),
    connectionType: normalizeString(value.connectionType, UNAVAILABLE, 20),
    effectiveConnectionType: normalizeString(value.effectiveConnectionType, UNAVAILABLE, 20),
    downlinkMbps: normalizeNumber(value.downlinkMbps, 0, 100000),
    roundTripTimeMs: normalizeNumber(value.roundTripTimeMs, 0, 600000),
    saveData: normalizeBooleanLabel(value.saveData),
    uaBrands: normalizeString(value.uaBrands),
    uaMobile: normalizeBooleanLabel(value.uaMobile),
    uaPlatform: normalizeString(value.uaPlatform),
  };
}

function extractResponseMeta(headers: Headers, clientAnalytics: SanitizedClientAnalytics): ResponseMeta {
  const forwarded = headers.get("x-forwarded-for") || "";
  const firstForwardedIp = forwarded.split(",")[0]?.trim();
  const ip =
    firstForwardedIp ||
    headers.get("x-real-ip") ||
    headers.get("x-vercel-forwarded-for") ||
    UNAVAILABLE;

  const city = headers.get("x-vercel-ip-city") || "";
  const region = headers.get("x-vercel-ip-country-region") || headers.get("x-vercel-ip-region") || "";
  const country = headers.get("x-vercel-ip-country") || "";
  const location = [city, region, country].filter(Boolean).join(", ") || UNAVAILABLE;

  const userAgent = headers.get("user-agent") || "";
  const acceptLanguage = headers.get("accept-language") || "";
  const acceptLanguagePrimary = acceptLanguage.split(",")[0]?.trim() || "";

  return {
    ip,
    location,
    browser: browserFromUserAgent(userAgent),
    device: deviceFromUserAgent(userAgent),
    os: osFromUserAgent(userAgent),
    userAgent: userAgent || UNAVAILABLE,
    language:
      clientAnalytics.language !== UNAVAILABLE
        ? clientAnalytics.language
        : normalizeString(acceptLanguagePrimary, UNAVAILABLE, 24),
    languages: clientAnalytics.languages,
    timezone: clientAnalytics.timezone,
    platform: clientAnalytics.platform,
    screenResolution: clientAnalytics.screenResolution,
    viewport: clientAnalytics.viewport,
    colorScheme: clientAnalytics.colorScheme,
    prefersReducedMotion: clientAnalytics.prefersReducedMotion,
    deviceMemoryGb: clientAnalytics.deviceMemoryGb,
    cpuCores: clientAnalytics.cpuCores,
    maxTouchPoints: clientAnalytics.maxTouchPoints,
    connectionType: clientAnalytics.connectionType,
    effectiveConnectionType: clientAnalytics.effectiveConnectionType,
    downlinkMbps: clientAnalytics.downlinkMbps,
    roundTripTimeMs: clientAnalytics.roundTripTimeMs,
    saveData: clientAnalytics.saveData,
    uaBrands: clientAnalytics.uaBrands,
    uaMobile: clientAnalytics.uaMobile,
    uaPlatform: clientAnalytics.uaPlatform,
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
    clientAnalytics?: unknown;
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

  const responseMeta = extractResponseMeta(
    request.headers,
    sanitizeClientAnalytics(payload.clientAnalytics)
  );
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
