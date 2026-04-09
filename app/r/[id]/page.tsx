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
import { FormAnswerValue, FormRecord, FormResponseRecord } from "@/lib/types";
import { authHeader, useAuthUser } from "@/lib/use-auth-user";
import { cn } from "@/lib/utils";

interface ResultsPayload {
  form: FormRecord;
  responses: FormResponseRecord[];
}

type DashboardView = "summary" | "question" | "individual";

interface ChartOptionStat {
  label: string;
  count: number;
  percentage: number;
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
];

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

function getFieldAnalytics(
  fieldId: string,
  fieldType: string,
  fieldOptions: string[] | undefined,
  maxRating: number | undefined,
  responses: FormResponseRecord[]
): FieldAnalytics {
  const totalResponses = responses.length;

  if (fieldType === "multiple_choice") {
    const optionCounts = new Map<string, number>();
    for (const option of fieldOptions ?? []) {
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

  if (fieldType === "checkbox") {
    const optionCounts = new Map<string, number>();
    for (const option of fieldOptions ?? []) {
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

  if (fieldType === "rating") {
    const ratingCap = maxRating ?? 5;
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
    if (samples.length < 8) {
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

function DonutChart({
  data,
  centerLabel,
}: {
  data: ChartOptionStat[];
  centerLabel: string;
}) {
  const nonZero = data.filter((item) => item.count > 0);

  if (nonZero.length === 0) {
    return (
      <div className="flex h-56 w-56 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
        No chart data
      </div>
    );
  }

  const gradientStops = nonZero
    .reduce(
      (acc, segment) => {
        const sweep = (segment.percentage / 100) * 360;
        const end = acc.angle + sweep;

        return {
          angle: end,
          stops: [...acc.stops, `${segment.color} ${acc.angle}deg ${end}deg`],
        };
      },
      { angle: 0, stops: [] as string[] }
    )
    .stops.join(", ");

  return (
    <div
      className="relative h-56 w-56 rounded-full shadow-inner"
      style={{ backgroundImage: `conic-gradient(${gradientStops})` }}
    >
      <div className="absolute inset-[22%] flex items-center justify-center rounded-full border border-white/70 bg-white/95 text-center shadow-sm">
        <span className="px-2 text-sm font-semibold text-slate-700">{centerLabel}</span>
      </div>
    </div>
  );
}

function DistributionBars({
  data,
  trackColor,
}: {
  data: ChartOptionStat[];
  trackColor: string;
}) {
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
            <span className="truncate font-medium text-slate-700">{item.label}</span>
            <span>
              {item.count} ({formatPercent(item.percentage)})
            </span>
          </div>
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
        </div>
      ))}
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
      fields.map((field) => [
        field.id,
        getFieldAnalytics(field.id, field.type, field.options, field.maxRating, payload.responses),
      ])
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

  const exportCsv = () => {
    if (!payload) {
      return;
    }

    const header = [
      csvEscape("Submitted At"),
      ...payload.form.fields
        .filter((field) => field.type !== "image")
        .map((field) => csvEscape(field.label)),
    ].join(",");

    const rows = payload.responses.map((response) => {
      const values = [
        csvEscape(new Date(response.created_at).toISOString()),
        ...payload.form.fields
          .filter((field) => field.type !== "image")
          .map((field) => csvEscape(answerToText(response.answers[field.id]))),
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
                          <DistributionBars
                            data={analytics.options.slice(0, 4)}
                            trackColor="#e2e8f0"
                          />
                        ) : null}

                        {analytics.kind === "rating" ? (
                          <>
                            <p className="mb-3 text-sm text-slate-600">
                              Average rating: <span className="font-semibold text-slate-900">{analytics.averageRating.toFixed(1)} / {analytics.maxRating}</span>
                            </p>
                            <DistributionBars data={analytics.buckets} trackColor="#e2e8f0" />
                          </>
                        ) : null}

                        {analytics.kind === "text" ? (
                          <div className="space-y-3">
                            <p className="text-sm text-slate-600">
                              {analytics.answered} answered, {analytics.unanswered} blank
                            </p>
                            {analytics.samples.length > 0 ? (
                              <ul className="space-y-2 text-sm text-slate-700">
                                {analytics.samples.slice(0, 3).map((sample, index) => (
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
              <section className="space-y-4 rounded-2xl border border-white/55 bg-white/92 p-5 shadow-lg">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Question breakdown</p>
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

                {(selectedFieldAnalytics.kind === "multiple_choice" ||
                  selectedFieldAnalytics.kind === "checkbox") &&
                selectedFieldAnalytics.options.length > 0 ? (
                  <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                    <div className="flex justify-center">
                      <DonutChart
                        data={selectedFieldAnalytics.options}
                        centerLabel={`${selectedFieldAnalytics.answered} answers`}
                      />
                    </div>
                    <div className="space-y-4">
                      {selectedFieldAnalytics.kind === "checkbox" ? (
                        <p className="text-sm text-slate-600">
                          Avg selections per response: {selectedFieldAnalytics.averageSelections.toFixed(1)}
                        </p>
                      ) : null}
                      <DistributionBars
                        data={selectedFieldAnalytics.options}
                        trackColor="#dbeafe"
                      />
                    </div>
                  </div>
                ) : null}

                {selectedFieldAnalytics.kind === "rating" ? (
                  <div className="space-y-5">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Average rating</p>
                      <p className="mt-1 text-3xl font-semibold text-slate-900">
                        {selectedFieldAnalytics.averageRating.toFixed(1)} / {selectedFieldAnalytics.maxRating}
                      </p>
                    </div>
                    <DistributionBars data={selectedFieldAnalytics.buckets} trackColor="#e2e8f0" />
                  </div>
                ) : null}

                {selectedFieldAnalytics.kind === "text" ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      {selectedFieldAnalytics.answered} answered, {selectedFieldAnalytics.unanswered} blank
                    </p>
                    {selectedFieldAnalytics.samples.length > 0 ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {selectedFieldAnalytics.samples.map((sample, index) => (
                          <div
                            key={`${selectedField.id}-text-${index}`}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                          >
                            {sample}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No written answers yet.</p>
                    )}
                  </div>
                ) : null}
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
