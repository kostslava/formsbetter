"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { THEMES } from "@/lib/theme";
import { FormField, FormRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function FormViewPage() {
  const params = useParams<{ id: string }>();
  const shortCode = params.id;

  const [form, setForm] = useState<FormRecord | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadForm() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/forms/public/${shortCode}`);
        const data = (await response.json()) as { form?: FormRecord; error?: string };

        if (!response.ok || !data.form) {
          throw new Error(data.error || "Form not found");
        }

        setForm(data.form);

        const initialAnswers: Record<string, string> = {};
        data.form.fields.forEach((field) => {
          if (field.type !== "image") {
            initialAnswers[field.id] = "";
          }
        });
        setAnswers(initialAnswers);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load form");
      } finally {
        setLoading(false);
      }
    }

    void loadForm();
  }, [shortCode]);

  const theme = useMemo(() => {
    if (!form) {
      return THEMES.orchid;
    }
    return THEMES[form.theme_id] ?? THEMES.orchid;
  }, [form]);

  const handleChange = (field: FormField, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [field.id]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formId: form.id,
          answers,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Failed to submit response");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
          <LoaderCircle size={16} className="animate-spin" />
          Loading form...
        </p>
      </main>
    );
  }

  if (error || !form) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error || "Form not found"}
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className={cn("grain-layer flex min-h-screen items-center justify-center px-4", theme.canvasClass)}>
        <section className="w-full max-w-xl rounded-2xl border border-white/50 bg-white/90 p-8 text-center shadow-xl backdrop-blur">
          <CheckCircle2 className="mx-auto mb-3" style={{ color: theme.accent }} size={30} />
          <h1 className="text-2xl font-semibold text-slate-900">Response recorded</h1>
          <p className="mt-2 text-sm text-slate-600">
            Thank you. Your response to {form.title} has been saved.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className={cn("grain-layer min-h-screen px-4 py-10 sm:px-6", theme.canvasClass)}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob-float absolute -left-20 top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="blob-float-slow absolute -right-16 top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      </div>

      <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-3xl border border-white/45 bg-white/85 shadow-xl backdrop-blur"
        >
          <div className={cn("p-7 text-white sm:p-9", theme.heroClass)}>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">{form.title}</h1>
            {form.description && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-white/85 sm:text-base">
                {form.description}
              </p>
            )}
          </div>
          <div className="h-1.5" style={{ backgroundColor: theme.accent }} />
        </motion.section>

        {form.fields.map((field, index) => (
          <motion.section
            key={field.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="rounded-2xl border border-white/50 bg-white/88 p-5 shadow-md backdrop-blur sm:p-6"
          >
            <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Item {index + 1}
            </div>

            {field.type === "image" ? (
              <figure className="space-y-3">
                {field.imageUrl ? (
                  <Image
                    src={field.imageUrl}
                    alt={field.label}
                    width={1280}
                    height={720}
                    className="max-h-[420px] w-full rounded-xl border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                    Image unavailable
                  </div>
                )}
                <figcaption className="text-sm font-medium text-slate-700">{field.label}</figcaption>
              </figure>
            ) : (
              <>
                <label className="mb-2 block text-base font-semibold text-slate-900">
                  {field.label}
                  {field.required && <span className="ml-1 text-rose-600">*</span>}
                </label>
                {field.type === "paragraph" ? (
                  <textarea
                    rows={4}
                    value={answers[field.id] || ""}
                    onChange={(event) => handleChange(field, event.target.value)}
                    required={field.required}
                    placeholder={field.placeholder || "Type your answer"}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                ) : (
                  <input
                    value={answers[field.id] || ""}
                    onChange={(event) => handleChange(field, event.target.value)}
                    required={field.required}
                    placeholder={field.placeholder || "Short answer"}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                )}
              </>
            )}
          </motion.section>
        ))}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <LoaderCircle size={16} className="animate-spin" /> : null}
          {submitting ? "Submitting..." : "Submit response"}
        </button>
      </form>
    </main>
  );
}
