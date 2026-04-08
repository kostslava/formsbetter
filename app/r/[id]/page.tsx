"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { signOut } from "firebase/auth";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, LoaderCircle, LogOut } from "lucide-react";
import { AuthPanel } from "@/components/auth-panel";
import { firebaseAuth } from "@/lib/firebase-client";
import { THEMES } from "@/lib/theme";
import { authHeader, useAuthUser } from "@/lib/use-auth-user";
import { FormRecord, FormResponseRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ResultsPayload {
  form: FormRecord;
  responses: FormResponseRecord[];
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function ResultsPage() {
  const { user, loading: authLoading } = useAuthUser();
  const params = useParams<{ id: string }>();
  const formId = params.id;

  const [payload, setPayload] = useState<ResultsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          .map((field) => csvEscape(response.answers[field.id] || "")),
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
          <section className="overflow-hidden rounded-2xl border border-white/50 bg-white/90 shadow-lg backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Submitted</th>
                    {payload.form.fields
                      .filter((field) => field.type !== "image")
                      .map((field) => (
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
                      {payload.form.fields
                        .filter((field) => field.type !== "image")
                        .map((field) => (
                          <td key={field.id} className="px-4 py-3 align-top">
                            {response.answers[field.id] || (
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
        )}
      </div>
    </main>
  );
}
