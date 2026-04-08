"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, Star } from "lucide-react";
import { THEMES } from "@/lib/theme";
import { FormAnswerValue, FormField, FormRecord, FormSection } from "@/lib/types";
import { cn } from "@/lib/utils";

function deriveSections(form: FormRecord): FormSection[] {
  if (Array.isArray(form.sections) && form.sections.length > 0) {
    return form.sections;
  }

  const fallback: FormSection = {
    id: "default-section",
    title: "Section 1",
    description: "",
  };

  return [fallback];
}

function fieldSectionId(field: FormField, sections: FormSection[]): string {
  return field.sectionId || sections[0]?.id || "default-section";
}

function requiredFieldError(field: FormField, value: FormAnswerValue | undefined): string | null {
  if (!field.required) {
    return null;
  }

  if (field.type === "short_text" || field.type === "paragraph" || field.type === "multiple_choice") {
    return typeof value === "string" && value.trim().length > 0 ? null : `${field.label} is required.`;
  }

  if (field.type === "checkbox") {
    return Array.isArray(value) && value.length > 0 ? null : `${field.label} is required.`;
  }

  if (field.type === "rating") {
    return typeof value === "number" && value > 0 ? null : `${field.label} is required.`;
  }

  return null;
}

export default function FormViewPage() {
  const params = useParams<{ id: string }>();
  const shortCode = params.id;

  const [form, setForm] = useState<FormRecord | null>(null);
  const [answers, setAnswers] = useState<Record<string, FormAnswerValue>>({});
  const [sectionIndex, setSectionIndex] = useState(0);
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

        const initialAnswers: Record<string, FormAnswerValue> = {};
        data.form.fields.forEach((field) => {
          if (field.type === "image") {
            return;
          }

          if (field.type === "checkbox") {
            initialAnswers[field.id] = [];
            return;
          }

          if (field.type === "rating") {
            initialAnswers[field.id] = 0;
            return;
          }

          initialAnswers[field.id] = "";
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

  const sections = useMemo(() => (form ? deriveSections(form) : []), [form]);

  const currentSection = sections[sectionIndex];

  const sectionFields = useMemo(() => {
    if (!form || !currentSection) {
      return [];
    }

    return form.fields.filter((field) => fieldSectionId(field, sections) === currentSection.id);
  }, [currentSection, form, sections]);

  const lastSection = sections.length > 0 && sectionIndex === sections.length - 1;

  const setTextAnswer = (field: FormField, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [field.id]: value,
    }));
  };

  const setCheckboxAnswer = (field: FormField, option: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[field.id]) ? (prev[field.id] as string[]) : [];
      const exists = current.includes(option);
      const maxSelections = field.maxSelections ?? Number.MAX_SAFE_INTEGER;

      if (exists) {
        return {
          ...prev,
          [field.id]: current.filter((value) => value !== option),
        };
      }

      if (current.length >= maxSelections) {
        return prev;
      }

      return {
        ...prev,
        [field.id]: [...current, option],
      };
    });
  };

  const validateCurrentSection = (): string | null => {
    for (const field of sectionFields) {
      const value = answers[field.id];
      const requiredError = requiredFieldError(field, value);
      if (requiredError) {
        return requiredError;
      }

      if (field.type === "checkbox") {
        const selections = Array.isArray(value) ? value.length : 0;
        const min = field.minSelections ?? 0;
        const max = field.maxSelections ?? Number.MAX_SAFE_INTEGER;

        if (selections < min) {
          return `${field.label} requires at least ${min} selections.`;
        }

        if (selections > max) {
          return `${field.label} allows at most ${max} selections.`;
        }
      }
    }

    return null;
  };

  const nextSection = () => {
    const sectionError = validateCurrentSection();
    if (sectionError) {
      setError(sectionError);
      return;
    }

    setError(null);
    setSectionIndex((prev) => Math.min(prev + 1, sections.length - 1));
  };

  const previousSection = () => {
    setError(null);
    setSectionIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) {
      return;
    }

    const sectionError = validateCurrentSection();
    if (sectionError) {
      setError(sectionError);
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

  if (error && !form) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      </main>
    );
  }

  if (!form) {
    return null;
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
      <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-3xl border border-white/45 bg-white/85 shadow-xl backdrop-blur"
        >
          <div className={cn("p-7 text-white sm:p-9", theme.heroClass)}>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">{form.title}</h1>
            {form.description ? <p className="mt-3 whitespace-pre-wrap text-sm text-white/85 sm:text-base">{form.description}</p> : null}

            {currentSection ? (
              <div className="mt-4 rounded-xl border border-white/25 bg-white/15 px-3 py-2 text-xs">
                <p className="font-semibold">
                  Section {sectionIndex + 1} of {sections.length}: {currentSection.title}
                </p>
                {currentSection.description ? <p className="mt-1 text-white/80">{currentSection.description}</p> : null}
              </div>
            ) : null}
          </div>
          <div className="h-1.5" style={{ backgroundColor: theme.accent }} />
        </motion.section>

        {sectionFields.map((field, index) => (
          <motion.section
            key={field.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="rounded-2xl border border-white/50 bg-white/88 p-5 shadow-md backdrop-blur sm:p-6"
          >
            <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">Item {index + 1}</div>

            {field.type === "image" ? (
              <figure className="space-y-3">
                {field.imageUrl ? (
                  <Image src={field.imageUrl} alt={field.label} width={1280} height={720} className="max-h-[420px] w-full rounded-xl border border-slate-200 object-cover" />
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">Image unavailable</div>
                )}
                <figcaption className="text-sm font-medium text-slate-700">{field.label}</figcaption>
              </figure>
            ) : (
              <>
                <label className="mb-2 block text-base font-semibold text-slate-900">
                  {field.label}
                  {field.required ? <span className="ml-1 text-rose-600">*</span> : null}
                </label>

                {field.type === "paragraph" ? (
                  <textarea
                    rows={4}
                    value={typeof answers[field.id] === "string" ? (answers[field.id] as string) : ""}
                    onChange={(event) => setTextAnswer(field, event.target.value)}
                    placeholder={field.placeholder || "Type your answer"}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                ) : null}

                {field.type === "short_text" ? (
                  <input
                    value={typeof answers[field.id] === "string" ? (answers[field.id] as string) : ""}
                    onChange={(event) => setTextAnswer(field, event.target.value)}
                    placeholder={field.placeholder || "Short answer"}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                ) : null}

                {field.type === "multiple_choice" && Array.isArray(field.options) ? (
                  <div className="space-y-2">
                    {field.options.map((option) => (
                      <label key={`${field.id}-${option}`} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name={field.id}
                          checked={answers[field.id] === option}
                          onChange={() => setTextAnswer(field, option)}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                ) : null}

                {field.type === "checkbox" && Array.isArray(field.options) ? (
                  <div className="space-y-2">
                    {field.options.map((option) => {
                      const selectedValues = Array.isArray(answers[field.id]) ? (answers[field.id] as string[]) : [];
                      const selected = selectedValues.includes(option);
                      const max = field.maxSelections ?? Number.MAX_SAFE_INTEGER;
                      const disableNewChoice = !selected && selectedValues.length >= max;

                      return (
                        <label key={`${field.id}-${option}`} className={cn("flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700", disableNewChoice ? "opacity-50" : "") }>
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={disableNewChoice}
                            onChange={() => setCheckboxAnswer(field, option)}
                          />
                          {option}
                        </label>
                      );
                    })}
                    <p className="text-xs text-slate-500">
                      Select {field.minSelections ?? 0} to {field.maxSelections ?? field.options.length} options.
                    </p>
                  </div>
                ) : null}

                {field.type === "rating" ? (
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: field.maxRating ?? 5 }).map((_, idx) => {
                      const value = idx + 1;
                      const current = typeof answers[field.id] === "number" ? (answers[field.id] as number) : 0;
                      const active = value <= current;

                      return (
                        <button
                          key={`${field.id}-${value}`}
                          type="button"
                          onClick={() => {
                            setAnswers((prev) => ({
                              ...prev,
                              [field.id]: value,
                            }));
                          }}
                          className={cn(
                            "rounded-lg border px-3 py-2 text-sm font-semibold transition",
                            active
                              ? "border-amber-400 bg-amber-50 text-amber-700"
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                          )}
                        >
                          <Star size={14} className="inline-block" /> {value}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </>
            )}
          </motion.section>
        ))}

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={previousSection}
            disabled={sectionIndex === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <ArrowLeft size={15} />
            Previous section
          </button>

          {lastSection ? (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <LoaderCircle size={16} className="animate-spin" /> : null}
              {submitting ? "Submitting..." : "Submit response"}
            </button>
          ) : (
            <button
              type="button"
              onClick={nextSection}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Next section
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </form>
    </main>
  );
}