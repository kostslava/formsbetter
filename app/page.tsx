"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Copy, Plus, Sparkles } from "lucide-react";
import { getOrCreateCreatorToken } from "@/lib/creator-token";
import { THEMES } from "@/lib/theme";
import { FormRecord } from "@/lib/types";

export default function Dashboard() {
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadForms() {
      setLoading(true);
      setError(null);

      try {
        const creatorToken = getOrCreateCreatorToken();
        const response = await fetch("/api/forms", {
          headers: {
            "x-creator-token": creatorToken,
          },
        });

        const data = (await response.json()) as { forms?: FormRecord[]; error?: string };

        if (!response.ok) {
          throw new Error(data.error || "Could not load forms");
        }

        setForms(data.forms ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load forms");
      } finally {
        setLoading(false);
      }
    }

    void loadForms();
  }, []);

  return (
    <main className="min-h-screen px-4 py-12 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="relative overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-7 shadow-lg backdrop-blur sm:p-10">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-200/60 blur-3xl" />
          <div className="absolute -bottom-16 left-28 h-48 w-48 rounded-full bg-cyan-200/70 blur-3xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
                <Sparkles size={14} />
                FormsBetter Studio
              </div>
              <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                Design forms that feel premium.
              </h1>
              <p className="max-w-2xl text-sm text-slate-600 sm:text-base">
                Build custom forms, share short links and QR codes instantly, and track every response in one dashboard.
              </p>
            </div>

            <Link
              href="/create"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <Plus size={18} />
              New Form
            </Link>
          </div>
        </section>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
            {error}
          </div>
        ) : forms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-lg font-medium text-slate-900">No forms yet</p>
            <p className="mt-2 text-sm text-slate-600">
              Create your first form to start collecting responses.
            </p>
            <Link
              href="/create"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 font-medium text-white transition hover:bg-violet-700"
            >
              <Plus size={16} />
              Create Form
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => {
              const theme = THEMES[form.theme_id] ?? THEMES.orchid;

              return (
                <article
                  key={form.id}
                  className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{
                        color: theme.accent,
                        backgroundColor: theme.softBg,
                      }}
                    >
                      {theme.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/f/${form.short_code}`;
                        void navigator.clipboard.writeText(url);
                      }}
                      className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                      aria-label="Copy form link"
                    >
                      <Copy size={16} />
                    </button>
                  </div>

                  <h2 className="mt-4 line-clamp-2 text-lg font-semibold text-slate-900">
                    {form.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                    {form.description || "No description"}
                  </p>

                  <div className="mt-auto flex items-center justify-between pt-5">
                    <Link
                      href={`/f/${form.short_code}`}
                      className="text-sm font-semibold text-slate-700 transition hover:text-slate-900"
                    >
                      Open Form
                    </Link>
                    <Link
                      href={`/r/${form.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <BarChart3 size={14} />
                      Results
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
