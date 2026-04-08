"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart3, Copy, Plus, Sparkles } from "lucide-react";
import { getOrCreateCreatorToken } from "@/lib/creator-token";
import { THEMES } from "@/lib/theme";
import { cn } from "@/lib/utils";
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
    <main className="grain-layer min-h-screen bg-[radial-gradient(circle_at_12%_8%,rgba(147,197,253,0.22),transparent_28%),radial-gradient(circle_at_88%_16%,rgba(244,114,182,0.18),transparent_25%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/70 p-7 shadow-xl backdrop-blur md:p-10"
        >
          <div className="blob-float absolute -left-10 top-6 h-56 w-56 rounded-full bg-violet-300/30 blur-3xl" />
          <div className="blob-float-slow absolute -right-16 top-3 h-64 w-64 rounded-full bg-cyan-300/25 blur-3xl" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                <Sparkles size={14} />
                FormsBetter Studio
              </div>
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                Build immersive forms, not plain documents.
              </h1>
              <p className="max-w-2xl text-sm text-slate-600 md:text-base">
                Craft a responsive, animated, mobile-first response flow with style presets and drag-first editing.
              </p>
            </div>

            <Link
              href="/create"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <Plus size={18} />
              New Form
            </Link>
          </div>
        </motion.section>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white/80"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
            {error}
          </div>
        ) : forms.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-sm backdrop-blur">
            <p className="text-xl font-semibold text-slate-900">No forms yet</p>
            <p className="mt-2 text-sm text-slate-600">
              Start by creating your first animated form experience.
            </p>
            <Link
              href="/create"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-700"
            >
              <Plus size={16} />
              Create Form
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {forms.map((form, idx) => {
              const theme = THEMES[form.theme_id] ?? THEMES.orchid;

              return (
                <motion.article
                  key={form.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/85 p-5 shadow-md backdrop-blur transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className={cn("rounded-xl border p-3 text-white", theme.borderClass, theme.heroClass)}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">
                        {theme.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const url = `${window.location.origin}/f/${form.short_code}`;
                          void navigator.clipboard.writeText(url);
                        }}
                        className="rounded-md bg-white/15 p-1.5 transition hover:bg-white/30"
                        aria-label="Copy form link"
                      >
                        <Copy size={15} />
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-white/85">{theme.mood}</p>
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
                      Open form
                    </Link>
                    <Link
                      href={`/r/${form.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <BarChart3 size={14} />
                      Results
                    </Link>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
