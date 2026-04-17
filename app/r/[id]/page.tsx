"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { signOut } from "firebase/auth";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  List,
  LoaderCircle,
  LogOut,
  User,
} from "lucide-react";
import { AuthPanel } from "@/components/auth-panel";
import { firebaseAuth } from "@/lib/firebase-client";
import { THEMES } from "@/lib/theme";
import { FormAnswerValue, FormField, FormRecord, FormResponseRecord } from "@/lib/types";
import { authHeader, useAuthUser } from "@/lib/use-auth-user";
import { cn } from "@/lib/utils";

interface ResultsPayload {
  form: FormRecord;
  responses: FormResponseRecord[];
}

type DashboardView = "summary" | "question" | "individual";
type QuestionChartMode = "compact" | "bar" | "pie" | "line" | "timeline";

interface ChartOptionStat {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

interface LinePoint {
  label: string;
  value: number;
  color: string;
}

type FieldAnalytics =
  | {
      kind: "multiple_choice";
      fieldId: string;
      answered: number;
      unanswered: number;
      responseRate: number;
      options: ChartOptionStat[];
    }
  | {
      kind: "checkbox";
      fieldId: string;
      answered: number;
      unanswered: number;
      responseRate: number;
      averageSelections: number;
      options: ChartOptionStat[];
    }
  | {
      kind: "rating";
      fieldId: string;
      answered: number;
      unanswered: number;
      responseRate: number;
      averageRating: number;
      maxRating: number;
      buckets: ChartOptionStat[];
    }
  | {
      kind: "text";
      fieldId: string;
      answered: number;
      unanswered: number;
      responseRate: number;
      samples: string[];
    };

const CHART_COLORS = [
  "#2563eb",
  "#0d9488",
  "#7c3aed",
  "#ea580c",
  "#dc2626",
  "#0891b2",
  "#65a30d",
  "#4f46e5",
  "#e11d48",
  "#0369a1",
  "#15803d",
  "#b45309",
];

const CHART_MODE_LABELS: Record<QuestionChartMode, string> = {
  compact: "Compact bars",
  bar: "Bar graph",
  pie: "Pie chart",
  line: "Line graph",
  timeline: "Timeline",
};

const RESPONSE_META_KEY = "__formsbetter_meta__";
const UNAVAILABLE = "Unavailable";

interface RespondentMeta {
  ip: string;
  location: string;
  browser: string;
  device: string;
  os: string;
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
  userAgent: string;
}

function metaString(value: unknown, fallback = UNAVAILABLE): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function metaNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function metaStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseRespondentMeta(response: FormResponseRecord): RespondentMeta {
  const rawValue = response.answers[RESPONSE_META_KEY] as FormAnswerValue | undefined;
  const fallback: RespondentMeta = {
    ip: UNAVAILABLE,
    location: UNAVAILABLE,
    browser: UNAVAILABLE,
    device: UNAVAILABLE,
    os: UNAVAILABLE,
    language: UNAVAILABLE,
    languages: [],
    timezone: UNAVAILABLE,
    platform: UNAVAILABLE,
    screenResolution: UNAVAILABLE,
    viewport: UNAVAILABLE,
    colorScheme: UNAVAILABLE,
    prefersReducedMotion: UNAVAILABLE,
    deviceMemoryGb: null,
    cpuCores: null,
    maxTouchPoints: null,
    connectionType: UNAVAILABLE,
    effectiveConnectionType: UNAVAILABLE,
    downlinkMbps: null,
    roundTripTimeMs: null,
    saveData: UNAVAILABLE,
    uaBrands: UNAVAILABLE,
    uaMobile: UNAVAILABLE,
    uaPlatform: UNAVAILABLE,
    userAgent: UNAVAILABLE,
  };

  if (typeof rawValue !== "string") {
    return fallback;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<RespondentMeta>;

    return {
      ip: metaString(parsed.ip, fallback.ip),
      location: metaString(parsed.location, fallback.location),
      browser: metaString(parsed.browser, fallback.browser),
      device: metaString(parsed.device, fallback.device),
      os: metaString(parsed.os, fallback.os),
      language: metaString(parsed.language, fallback.language),
      languages: metaStringArray(parsed.languages),
      timezone: metaString(parsed.timezone, fallback.timezone),
      platform: metaString(parsed.platform, fallback.platform),
      screenResolution: metaString(parsed.screenResolution, fallback.screenResolution),
      viewport: metaString(parsed.viewport, fallback.viewport),
      colorScheme: metaString(parsed.colorScheme, fallback.colorScheme),
      prefersReducedMotion: metaString(parsed.prefersReducedMotion, fallback.prefersReducedMotion),
      deviceMemoryGb: metaNumber(parsed.deviceMemoryGb),
      cpuCores: metaNumber(parsed.cpuCores),
      maxTouchPoints: metaNumber(parsed.maxTouchPoints),
      connectionType: metaString(parsed.connectionType, fallback.connectionType),
      effectiveConnectionType: metaString(
        parsed.effectiveConnectionType,
        fallback.effectiveConnectionType
      ),
      downlinkMbps: metaNumber(parsed.downlinkMbps),
      roundTripTimeMs: metaNumber(parsed.roundTripTimeMs),
      saveData: metaString(parsed.saveData, fallback.saveData),
      uaBrands: metaString(parsed.uaBrands, fallback.uaBrands),
      uaMobile: metaString(parsed.uaMobile, fallback.uaMobile),
      uaPlatform: metaString(parsed.uaPlatform, fallback.uaPlatform),
      userAgent: metaString(parsed.userAgent, fallback.userAgent),
    };
  } catch {
    return fallback;
  }
}

function formatNullableNumber(value: number | null, suffix = ""): string {
  if (value === null) {
    return UNAVAILABLE;
  }

  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  return `${formatted}${suffix}`;
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function answerToText(value: FormAnswerValue | undefined): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.join(" | ");
  }

  return String(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function isAnswerFilled(value: FormAnswerValue | undefined): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return false;
}

function responseAnswerCount(response: FormResponseRecord, fieldIds: string[]): number {
  return fieldIds.reduce((total, fieldId) => {
    const value = response.answers[fieldId] as FormAnswerValue | undefined;
    return total + (isAnswerFilled(value) ? 1 : 0);
  }, 0);
}

function toChartOptionStats(counts: Array<{ label: string; count: number }>, denominator: number): ChartOptionStat[] {
  return counts.map((item, index) => ({
    label: item.label,
    count: item.count,
    percentage: denominator > 0 ? (item.count / denominator) * 100 : 0,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));
}

function getFieldAnalytics(field: FormField, responses: FormResponseRecord[]): FieldAnalytics {
  const totalResponses = responses.length;
  const fieldId = field.id;

  if (field.type === "multiple_choice") {
    const optionCounts = new Map<string, number>();
    for (const option of field.options ?? []) {
      optionCounts.set(option, 0);
    }
    let answered = 0;

    for (const response of responses) {
      const value = response.answers[fieldId] as FormAnswerValue | undefined;
      if (typeof value !== "string" || value.trim().length === 0) {
        continue;
      }

      answered += 1;
      const key = optionCounts.has(value) ? value : "Other";
      optionCounts.set(key, (optionCounts.get(key) ?? 0) + 1);
    }

    const options = toChartOptionStats(
      [...optionCounts.entries()].map(([label, count]) => ({ label, count })),
      answered
    );

    return {
      kind: "multiple_choice",
      fieldId,
      answered,
      unanswered: totalResponses - answered,
      responseRate: totalResponses > 0 ? (answered / totalResponses) * 100 : 0,
      options,
    };
  }

  if (field.type === "checkbox") {
    const optionCounts = new Map<string, number>();
    for (const option of field.options ?? []) {
      optionCounts.set(option, 0);
    }

    let answered = 0;
    let totalSelections = 0;

    for (const response of responses) {
      const value = response.answers[fieldId] as FormAnswerValue | undefined;
      if (!Array.isArray(value) || value.length === 0) {
        continue;
      }

      answered += 1;
      totalSelections += value.length;

      for (const selected of value) {
        const key = optionCounts.has(selected) ? selected : "Other";
        optionCounts.set(key, (optionCounts.get(key) ?? 0) + 1);
      }
    }

    const options = toChartOptionStats(
      [...optionCounts.entries()].map(([label, count]) => ({ label, count })),
      answered
    );

    return {
      kind: "checkbox",
      fieldId,
      answered,
      unanswered: totalResponses - answered,
      responseRate: totalResponses > 0 ? (answered / totalResponses) * 100 : 0,
      averageSelections: answered > 0 ? totalSelections / answered : 0,
      options,
    };
  }

  if (field.type === "rating") {
    const ratingCap = field.maxRating ?? 5;
    const buckets = Array.from({ length: ratingCap }).map((_, index) => ({
      label: `${index + 1} star${index === 0 ? "" : "s"}`,
      count: 0,
    }));

    let answered = 0;
    let totalRating = 0;

    for (const response of responses) {
      const value = response.answers[fieldId] as FormAnswerValue | undefined;
      if (typeof value !== "number" || value < 1 || value > ratingCap) {
        continue;
      }

      answered += 1;
      totalRating += value;
      buckets[value - 1].count += 1;
    }

    return {
      kind: "rating",
      fieldId,
      answered,
      unanswered: totalResponses - answered,
      responseRate: totalResponses > 0 ? (answered / totalResponses) * 100 : 0,
      averageRating: answered > 0 ? totalRating / answered : 0,
      maxRating: ratingCap,
      buckets: toChartOptionStats(buckets, answered),
    };
  }

  const samples: string[] = [];
  let answered = 0;

  for (const response of responses) {
    const value = response.answers[fieldId] as FormAnswerValue | undefined;
    if (typeof value !== "string" || value.trim().length === 0) {
      continue;
    }

    answered += 1;
    if (samples.length < 12) {
      samples.push(value.trim());
    }
  }

  return {
    kind: "text",
    fieldId,
    answered,
    unanswered: totalResponses - answered,
    responseRate: totalResponses > 0 ? (answered / totalResponses) * 100 : 0,
    samples,
  };
}

function chartModesForAnalytics(analytics: FieldAnalytics | null): QuestionChartMode[] {
  if (!analytics) {
    return ["compact"];
  }

  if (analytics.kind === "multiple_choice") {
    return ["compact", "bar", "pie", "line"];
  }

  if (analytics.kind === "checkbox") {
    return ["compact", "bar", "line"];
  }

  if (analytics.kind === "rating") {
    return ["compact", "bar", "line", "pie"];
  }

  return ["timeline", "compact"];
}

function buildTextTimelinePoints(fieldId: string, responses: FormResponseRecord[]): LinePoint[] {
  if (responses.length === 0) {
    return [];
  }

  const sorted = [...responses].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let cumulative = 0;
  const raw = sorted.map((response) => {
    if (isAnswerFilled(response.answers[fieldId] as FormAnswerValue | undefined)) {
      cumulative += 1;
    }

    return {
      label: new Date(response.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      value: cumulative,
      color: "#0d9488",
    };
  });

  if (raw.length <= 14) {
    return raw;
  }

  const sampled: LinePoint[] = [];
  const lastIndex = raw.length - 1;

  for (let i = 0; i < 14; i += 1) {
    const index = Math.round((i * lastIndex) / 13);
    const point = raw[index];

    if (!sampled.some((candidate) => candidate.label === point.label && candidate.value === point.value)) {
      sampled.push(point);
    }
  }

  const tail = raw[lastIndex];
  if (sampled[sampled.length - 1] !== tail) {
    sampled.push(tail);
  }

  return sampled;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const radians = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function pieSlicePath(cx: number, cy: number, radius: number, startDeg: number, endDeg: number): string {
  const start = polarToCartesian(cx, cy, radius, startDeg);
  const end = polarToCartesian(cx, cy, radius, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;

  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function CompactAnswerRows({
  data,
  trackColor,
}: {
  data: ChartOptionStat[];
  trackColor: string;
}) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500">No answers to chart yet.</p>;
  }

  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div
          key={item.label}
          className="grid grid-cols-[minmax(0,140px)_1fr_84px] items-center gap-2 rounded-lg border border-slate-100 bg-white/80 px-2.5 py-2 sm:grid-cols-[minmax(0,220px)_1fr_96px]"
        >
          <p
            title={item.label}
            className="truncate whitespace-nowrap text-sm font-medium leading-tight text-slate-700"
          >
            {item.label}
          </p>
          <div
            className="h-2.5 overflow-hidden rounded-full"
            style={{ backgroundColor: trackColor }}
            aria-hidden
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(item.percentage, 100)}%`,
                backgroundColor: item.color,
                minWidth: item.count > 0 ? "6px" : undefined,
              }}
            />
          </div>
          <p className="w-full whitespace-nowrap text-right text-xs font-semibold tabular-nums text-slate-600">
            {item.count} · {formatPercent(item.percentage)}
          </p>
        </div>
      ))}
    </div>
  );
}

function PieChart({
  data,
  centerLabel,
}: {
  data: ChartOptionStat[];
  centerLabel: string;
}) {
  const nonZero = data.filter((item) => item.count > 0);
  const total = nonZero.reduce((sum, item) => sum + item.count, 0);

  if (total === 0 || nonZero.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
        No chart data
      </div>
    );
  }

  const slices = nonZero.reduce(
    (acc, item) => {
      const start = (acc.running / total) * 360 - 90;
      const nextRunning = acc.running + item.count;
      const end = (nextRunning / total) * 360 - 90;

      return {
        running: nextRunning,
        values: [
          ...acc.values,
          {
            ...item,
            start,
            end,
          },
        ],
      };
    },
    {
      running: 0,
      values: [] as Array<ChartOptionStat & { start: number; end: number }>,
    }
  ).values;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 120 120" className="h-56 w-56 drop-shadow-sm" role="img" aria-label="Pie chart">
        {slices.length === 1 ? (
          <circle cx="60" cy="60" r="52" fill={slices[0].color} />
        ) : (
          slices.map((slice) => (
            <path
              key={`${slice.label}-${slice.start}`}
              d={pieSlicePath(60, 60, 52, slice.start, slice.end)}
              fill={slice.color}
            />
          ))
        )}
        <circle cx="60" cy="60" r="27" fill="white" />
        <text x="60" y="58" textAnchor="middle" className="fill-slate-700 text-[6px] font-bold">
          {centerLabel}
        </text>
      </svg>
    </div>
  );
}

function VerticalBarChart({ data }: { data: ChartOptionStat[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
        No chart data
      </div>
    );
  }

  const maxValue = Math.max(...data.map((item) => item.count), 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex min-h-52 items-end gap-2">
        {data.map((item) => {
          const height = (item.count / maxValue) * 180;

          return (
            <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">{item.count}</span>
              <div className="flex h-[180px] w-full items-end rounded-md bg-slate-100/90 px-1">
                <div
                  className="w-full rounded-md"
                  style={{
                    height: `${Math.max(height, item.count > 0 ? 8 : 0)}px`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <span
                title={item.label}
                className="block w-full truncate whitespace-nowrap text-center text-[11px] leading-tight text-slate-600"
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LineGraph({
  points,
  lineColor,
  ariaLabel,
}: {
  points: LinePoint[];
  lineColor: string;
  ariaLabel: string;
}) {
  if (points.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
        Not enough points for a line graph
      </div>
    );
  }

  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const coordinates = points.map((point, index) => {
    const x = (index / (points.length - 1)) * 100;
    const y = 36 - (point.value / maxValue) * 30;
    return { ...point, x, y };
  });

  const linePath = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L 100 38 L 0 38 Z`;

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
      <svg viewBox="0 0 100 40" className="h-56 w-full" role="img" aria-label={ariaLabel}>
        <line x1="0" y1="38" x2="100" y2="38" stroke="#cbd5e1" strokeWidth="0.5" />
        <line x1="0" y1="8" x2="100" y2="8" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2 2" />
        <path d={areaPath} fill={lineColor} opacity="0.13" />
        <path d={linePath} fill="none" stroke={lineColor} strokeWidth="1.7" strokeLinecap="round" />
        {coordinates.map((point) => (
          <circle key={`${point.label}-${point.x}`} cx={point.x} cy={point.y} r="1.4" fill={lineColor} />
        ))}
      </svg>

      <div className="flex flex-wrap gap-2">
        {coordinates.map((point) => (
          <span key={`${point.label}-${point.value}`} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
            {point.label}: {point.value}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const { user, loading: authLoading } = useAuthUser();
  const params = useParams<{ id: string }>();
  const formId = params.id;

  const [payload, setPayload] = useState<ResultsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<DashboardView>("summary");
  const [selectedFieldId, setSelectedFieldId] = useState<string>("");
  const [selectedResponseIndex, setSelectedResponseIndex] = useState(0);
  const [chartMode, setChartMode] = useState<QuestionChartMode>("compact");

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setPayload(null);
      setLoading(false);
      return;
    }

    async function loadResults() {
      setLoading(true);
      setError(null);

      try {
        const headers = await authHeader(user);
        const response = await fetch(`/api/forms/${formId}/responses`, {
          headers,
        });

        const data = (await response.json()) as
          | (ResultsPayload & { error?: string })
          | { error: string };

        if (!response.ok || !("form" in data)) {
          throw new Error(data.error || "Could not load responses");
        }

        setPayload({
          form: data.form,
          responses: data.responses,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load responses");
      } finally {
        setLoading(false);
      }
    }

    void loadResults();
  }, [authLoading, formId, user]);

  const theme = useMemo(() => {
    if (!payload) {
      return THEMES.orchid;
    }
    return THEMES[payload.form.theme_id] ?? THEMES.orchid;
  }, [payload]);

  const fields = useMemo(
    () => payload?.form.fields.filter((field) => field.type !== "image") ?? [],
    [payload]
  );

  const fieldIds = useMemo(() => fields.map((field) => field.id), [fields]);

  const analyticsByField = useMemo(() => {
    if (!payload) {
      return new Map<string, FieldAnalytics>();
    }

    return new Map<string, FieldAnalytics>(
      fields.map((field) => [field.id, getFieldAnalytics(field, payload.responses)])
    );
  }, [fields, payload]);

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId) ?? fields[0],
    [fields, selectedFieldId]
  );

  const selectedFieldAnalytics = useMemo(() => {
    if (!selectedField) {
      return null;
    }
    return analyticsByField.get(selectedField.id) ?? null;
  }, [analyticsByField, selectedField]);

  const availableChartModes = useMemo(
    () => chartModesForAnalytics(selectedFieldAnalytics),
    [selectedFieldAnalytics]
  );

  const selectedOptionData = useMemo(() => {
    if (!selectedFieldAnalytics) {
      return [] as ChartOptionStat[];
    }

    if (selectedFieldAnalytics.kind === "multiple_choice" || selectedFieldAnalytics.kind === "checkbox") {
      return selectedFieldAnalytics.options;
    }

    if (selectedFieldAnalytics.kind === "rating") {
      return selectedFieldAnalytics.buckets;
    }

    return [] as ChartOptionStat[];
  }, [selectedFieldAnalytics]);

  const selectedLinePoints = useMemo(() => {
    if (!selectedFieldAnalytics || !selectedField) {
      return [] as LinePoint[];
    }

    if (selectedFieldAnalytics.kind === "text") {
      return payload ? buildTextTimelinePoints(selectedField.id, payload.responses) : [];
    }

    return selectedOptionData.map((item) => ({
      label: item.label,
      value: item.count,
      color: item.color,
    }));
  }, [payload, selectedField, selectedFieldAnalytics, selectedOptionData]);

  const answeredCells = useMemo(() => {
    if (!payload || fieldIds.length === 0) {
      return 0;
    }

    return payload.responses.reduce(
      (total, response) => total + responseAnswerCount(response, fieldIds),
      0
    );
  }, [fieldIds, payload]);

  const totalCells = useMemo(() => {
    if (!payload) {
      return 0;
    }
    return payload.responses.length * fieldIds.length;
  }, [fieldIds.length, payload]);

  const completionRate = totalCells > 0 ? (answeredCells / totalCells) * 100 : 0;

  useEffect(() => {
    if (fields.length === 0) {
      setSelectedFieldId("");
      return;
    }

    const currentIsValid = fields.some((field) => field.id === selectedFieldId);
    if (!currentIsValid) {
      setSelectedFieldId(fields[0].id);
    }
  }, [fields, selectedFieldId]);

  useEffect(() => {
    setSelectedResponseIndex(0);
  }, [payload?.form.id]);

  useEffect(() => {
    if (availableChartModes.length === 0) {
      return;
    }

    if (!availableChartModes.includes(chartMode)) {
      setChartMode(availableChartModes[0]);
    }
  }, [availableChartModes, chartMode]);

  const exportCsv = () => {
    if (!payload) {
      return;
    }

    const exportFields = payload.form.fields.filter((field) => field.type !== "image");

    const header = [
      csvEscape("Timestamp"),
      ...exportFields.map((field) => csvEscape(field.label)),
    ].join(",");

    const rows = [...payload.responses]
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      .map((response) => {
      const values = [
        csvEscape(new Date(response.created_at).toLocaleString()),
        ...exportFields.map((field) =>
          csvEscape(answerToText(response.answers[field.id]))
        ),
      ];

      return values.join(",");
      });

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${payload.form.title}-responses.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeResponse = payload?.responses[selectedResponseIndex] ?? null;
  const activeResponseMeta = useMemo(
    () => (activeResponse ? parseRespondentMeta(activeResponse) : null),
    [activeResponse]
  );

  const responseProgress = (response: FormResponseRecord) => {
    const answered = responseAnswerCount(response, fieldIds);
    const total = fieldIds.length;
    const percent = total > 0 ? (answered / total) * 100 : 0;

    return {
      answered,
      total,
      percent,
    };
  };

  const tabClass = (target: DashboardView) =>
    cn(
      "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
      view === target
        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
    );

  const modeClass = (target: QuestionChartMode) =>
    cn(
      "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
      chartMode === target
        ? "border-slate-900 bg-slate-900 text-white"
        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
    );

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
          Checking account...
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="grain-layer flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_14%_12%,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_86%_16%,rgba(249,115,22,0.16),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] px-4 py-10">
        <AuthPanel title="Sign in to view responses" subtitle="Results are private to your Firebase account." />
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
          <LoaderCircle size={16} className="animate-spin" />
          Loading responses...
        </p>
      </main>
    );
  }

  if (error || !payload) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error || "Unable to open results"}
        </div>
      </main>
    );
  }

  return (
    <main className={cn("grain-layer min-h-screen px-4 py-10 sm:px-6", theme.canvasClass)}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob-float absolute -left-16 top-14 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="blob-float-slow absolute -right-16 top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/50 bg-white/88 p-5 shadow-xl backdrop-blur sm:p-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                <ArrowLeft size={14} />
                Dashboard
              </Link>
              <p className="text-xs text-slate-500">Signed in as {user.email ?? "anonymous"}</p>
              <h1 className="text-3xl font-semibold text-slate-900">{payload.form.title}</h1>
              <p className="text-sm text-slate-600">
                {payload.responses.length} response{payload.responses.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (firebaseAuth) {
                    void signOut(firebaseAuth);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <LogOut size={14} />
                Sign out
              </button>
              <a
                href={`/f/${payload.form.short_code}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Open live form
              </a>
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                <Download size={15} />
                Export CSV
              </button>
            </div>
          </div>

          <div className="mt-4 h-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
        </motion.section>

        {payload.responses.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-14 text-center text-sm text-slate-600">
            No responses yet. Share the form URL to start collecting answers.
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total responses</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{payload.responses.length}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Questions tracked</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{fields.length}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Overall completion</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{formatPercent(completionRate)}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Last response</p>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-800">
                  {new Date(payload.responses[0].created_at).toLocaleString()}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-white/50 bg-white/90 p-3 shadow-lg backdrop-blur sm:p-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setView("summary")} className={tabClass("summary")}>
                  <List size={15} />
                  Summary
                </button>
                <button type="button" onClick={() => setView("question")} className={tabClass("question")}>
                  <BarChart3 size={15} />
                  Question
                </button>
                <button type="button" onClick={() => setView("individual")} className={tabClass("individual")}>
                  <User size={15} />
                  Individual
                </button>
              </div>
            </section>

            {view === "summary" ? (
              <section className="grid gap-4 md:grid-cols-2">
                {fields.map((field) => {
                  const analytics = analyticsByField.get(field.id);
                  if (!analytics) {
                    return null;
                  }

                  return (
                    <article
                      key={field.id}
                      className="rounded-2xl border border-white/60 bg-white/92 p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            {field.type.replace(/_/g, " ")}
                          </p>
                          <h3 className="mt-1 text-base font-semibold text-slate-900">{field.label}</h3>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {formatPercent(analytics.responseRate)} answered
                        </span>
                      </div>

                      <div className="mt-4">
                        {(analytics.kind === "multiple_choice" || analytics.kind === "checkbox") &&
                        analytics.options.length > 0 ? (
                          <CompactAnswerRows data={analytics.options} trackColor="#e2e8f0" />
                        ) : null}

                        {analytics.kind === "rating" ? (
                          <>
                            <p className="mb-3 text-sm text-slate-600">
                              Average rating: <span className="font-semibold text-slate-900">{analytics.averageRating.toFixed(1)} / {analytics.maxRating}</span>
                            </p>
                            <CompactAnswerRows data={analytics.buckets} trackColor="#e2e8f0" />
                          </>
                        ) : null}

                        {analytics.kind === "text" ? (
                          <div className="space-y-3">
                            <p className="text-sm text-slate-600">
                              {analytics.answered} answered, {analytics.unanswered} blank
                            </p>
                            {analytics.samples.length > 0 ? (
                              <ul className="space-y-2 text-sm text-slate-700">
                                {analytics.samples.slice(0, 4).map((sample, index) => (
                                  <li key={`${field.id}-sample-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                    {sample}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-slate-500">No text responses yet.</p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </section>
            ) : null}

            {view === "question" && selectedField && selectedFieldAnalytics ? (
              <section className="relative overflow-hidden rounded-2xl border border-white/55 bg-white/94 p-5 shadow-lg">
                <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-sky-200/30 blur-3xl" />
                <div className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-orange-200/30 blur-3xl" />

                <div className="relative space-y-5">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Question analytics</p>
                      <h2 className="mt-1 text-xl font-semibold text-slate-900">{selectedField.label}</h2>
                    </div>

                    <label className="block text-sm font-medium text-slate-700">
                      Question
                      <select
                        value={selectedField.id}
                        onChange={(event) => setSelectedFieldId(event.target.value)}
                        className="mt-1 block min-w-[260px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-500"
                      >
                        {fields.map((field) => (
                          <option key={field.id} value={field.id}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      {selectedFieldAnalytics.answered} answered
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      {selectedFieldAnalytics.unanswered} blank
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      {formatPercent(selectedFieldAnalytics.responseRate)} response rate
                    </span>
                    {selectedFieldAnalytics.kind === "checkbox" ? (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        Avg selections: {selectedFieldAnalytics.averageSelections.toFixed(1)}
                      </span>
                    ) : null}
                    {selectedFieldAnalytics.kind === "rating" ? (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        Avg rating: {selectedFieldAnalytics.averageRating.toFixed(1)} / {selectedFieldAnalytics.maxRating}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {availableChartModes.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setChartMode(mode)}
                        className={modeClass(mode)}
                      >
                        {CHART_MODE_LABELS[mode]}
                      </button>
                    ))}
                  </div>

                  {selectedFieldAnalytics.kind === "text" ? (
                    chartMode === "timeline" ? (
                      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                        <LineGraph
                          points={selectedLinePoints}
                          lineColor="#0d9488"
                          ariaLabel="Text response timeline"
                        />
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">Sample responses</p>
                          {selectedFieldAnalytics.samples.length > 0 ? (
                            <div className="space-y-2">
                              {selectedFieldAnalytics.samples.map((sample, index) => (
                                <p
                                  key={`${selectedField.id}-sample-${index}`}
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                                >
                                  {sample}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">No written answers yet.</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">Sample responses</p>
                        {selectedFieldAnalytics.samples.length > 0 ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            {selectedFieldAnalytics.samples.map((sample, index) => (
                              <p
                                key={`${selectedField.id}-compact-sample-${index}`}
                                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                              >
                                {sample}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">No written answers yet.</p>
                        )}
                      </div>
                    )
                  ) : chartMode === "compact" ? (
                    <CompactAnswerRows data={selectedOptionData} trackColor="#dbeafe" />
                  ) : (
                    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                      {chartMode === "pie" ? (
                        <PieChart
                          data={selectedOptionData}
                          centerLabel={`${selectedFieldAnalytics.answered} answers`}
                        />
                      ) : null}

                      {chartMode === "bar" ? <VerticalBarChart data={selectedOptionData} /> : null}

                      {chartMode === "line" ? (
                        <LineGraph
                          points={selectedLinePoints}
                          lineColor="#2563eb"
                          ariaLabel="Answer distribution line graph"
                        />
                      ) : null}

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">Answer breakdown</p>
                        <CompactAnswerRows data={selectedOptionData} trackColor="#e2e8f0" />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {view === "individual" ? (
              <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
                <aside className="rounded-2xl border border-white/60 bg-white/92 p-3 shadow-sm">
                  <p className="px-2 pb-2 text-xs uppercase tracking-wide text-slate-500">
                    Individual responses
                  </p>
                  <div className="max-h-[540px] space-y-2 overflow-y-auto pr-1">
                    {payload.responses.map((response, index) => {
                      const progress = responseProgress(response);
                      const selected = index === selectedResponseIndex;

                      return (
                        <button
                          key={response.id}
                          type="button"
                          onClick={() => setSelectedResponseIndex(index)}
                          className={cn(
                            "w-full rounded-xl border px-3 py-2 text-left transition",
                            selected
                              ? "border-slate-800 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          <p className="text-xs font-semibold">Response {payload.responses.length - index}</p>
                          <p className={cn("mt-1 text-xs", selected ? "text-slate-300" : "text-slate-500")}>
                            {new Date(response.created_at).toLocaleString()}
                          </p>
                          <p className={cn("mt-1 text-xs", selected ? "text-slate-300" : "text-slate-500")}>
                            {progress.answered}/{progress.total} answered ({formatPercent(progress.percent)})
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </aside>

                <article className="rounded-2xl border border-white/60 bg-white/95 p-5 shadow-lg">
                  {activeResponse ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Selected response</p>
                          <p className="mt-1 inline-flex items-center gap-2 text-sm text-slate-600">
                            <Clock3 size={14} />
                            {new Date(activeResponse.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedResponseIndex((index) => Math.max(index - 1, 0))}
                            disabled={selectedResponseIndex === 0}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ChevronLeft size={14} />
                            Prev
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedResponseIndex((index) =>
                                Math.min(index + 1, payload.responses.length - 1)
                              )
                            }
                            disabled={selectedResponseIndex === payload.responses.length - 1}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Next
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>

                      <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Respondent info</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">IP</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">{activeResponseMeta?.ip ?? UNAVAILABLE}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Approx location</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">{activeResponseMeta?.location ?? UNAVAILABLE}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Device</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">{activeResponseMeta?.device ?? UNAVAILABLE}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Browser</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">{activeResponseMeta?.browser ?? UNAVAILABLE}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Operating system</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">{activeResponseMeta?.os ?? UNAVAILABLE}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Platform</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">{activeResponseMeta?.platform ?? UNAVAILABLE}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Language</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">{activeResponseMeta?.language ?? UNAVAILABLE}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Languages</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">
                              {activeResponseMeta && activeResponseMeta.languages.length > 0
                                ? activeResponseMeta.languages.join(", ")
                                : UNAVAILABLE}
                            </p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Timezone</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">{activeResponseMeta?.timezone ?? UNAVAILABLE}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Approx RAM</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">
                              {formatNullableNumber(activeResponseMeta?.deviceMemoryGb ?? null, " GB")}
                            </p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Approx CPU cores</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">
                              {formatNullableNumber(activeResponseMeta?.cpuCores ?? null)}
                            </p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Max touch points</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">
                              {formatNullableNumber(activeResponseMeta?.maxTouchPoints ?? null)}
                            </p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Screen resolution</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">{activeResponseMeta?.screenResolution ?? UNAVAILABLE}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Viewport</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">{activeResponseMeta?.viewport ?? UNAVAILABLE}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Connection type</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">{activeResponseMeta?.connectionType ?? UNAVAILABLE}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Effective connection</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">{activeResponseMeta?.effectiveConnectionType ?? UNAVAILABLE}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Downlink</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">
                              {formatNullableNumber(activeResponseMeta?.downlinkMbps ?? null, " Mbps")}
                            </p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">RTT</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">
                              {formatNullableNumber(activeResponseMeta?.roundTripTimeMs ?? null, " ms")}
                            </p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Data saver</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">{activeResponseMeta?.saveData ?? UNAVAILABLE}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Color scheme</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">{activeResponseMeta?.colorScheme ?? UNAVAILABLE}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Reduced motion</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">
                              {activeResponseMeta?.prefersReducedMotion ?? UNAVAILABLE}
                            </p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">UA brands</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">{activeResponseMeta?.uaBrands ?? UNAVAILABLE}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">UA platform</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">{activeResponseMeta?.uaPlatform ?? UNAVAILABLE}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">UA mobile</p>
                            <p className="mt-0.5 text-sm font-medium text-slate-700">{activeResponseMeta?.uaMobile ?? UNAVAILABLE}</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 sm:col-span-2 xl:col-span-3">
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">User agent</p>
                            <p title={activeResponseMeta?.userAgent ?? UNAVAILABLE} className="mt-0.5 truncate text-sm font-medium text-slate-700">
                              {activeResponseMeta?.userAgent ?? UNAVAILABLE}
                            </p>
                          </div>
                        </div>
                      </section>

                      <div className="mt-5 space-y-3">
                        {fields.map((field, index) => {
                          const value = activeResponse.answers[field.id] as FormAnswerValue | undefined;

                          return (
                            <div key={field.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Question {index + 1}</p>
                              <h3 className="mt-1 text-sm font-semibold text-slate-900">{field.label}</h3>
                              <div className="mt-2 text-sm text-slate-700">
                                {Array.isArray(value) ? (
                                  value.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {value.map((item) => (
                                        <span
                                          key={`${field.id}-${item}`}
                                          className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                                        >
                                          {item}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">No answer</span>
                                  )
                                ) : typeof value === "number" ? (
                                  <span className="font-semibold text-slate-900">{value}</span>
                                ) : typeof value === "string" && value.trim().length > 0 ? (
                                  <span className="whitespace-pre-wrap">{value}</span>
                                ) : (
                                  <span className="text-slate-400">No answer</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                </article>
              </section>
            ) : null}

            <section className="overflow-hidden rounded-2xl border border-white/55 bg-white/92 shadow-lg backdrop-blur">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-800">All responses table</h2>
                <p className="text-xs text-slate-500">Quick scan across every submission</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Submitted</th>
                      {fields.map((field) => (
                        <th key={field.id} className="px-4 py-3 font-semibold">
                          {field.label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {payload.responses.map((response) => (
                      <tr key={response.id} className="border-t border-slate-100 text-sm text-slate-700">
                        <td className="px-4 py-3 align-top text-xs text-slate-500">
                          {new Date(response.created_at).toLocaleString()}
                        </td>
                        {fields.map((field) => (
                          <td key={field.id} className="px-4 py-3 align-top">
                            {answerToText(response.answers[field.id]) || (
                              <span className="text-slate-300">No answer</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
