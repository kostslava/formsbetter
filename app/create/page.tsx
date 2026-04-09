"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { motion, Reorder } from "framer-motion";
import { signOut } from "firebase/auth";
import {
  Check,
  CheckSquare,
  Copy,
  Gauge,
  ImageIcon,
  ListChecks,
  LoaderCircle,
  Palette,
  Plus,
  Save,
  Star,
  Text,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { AuthPanel } from "@/components/auth-panel";
import { deriveSectionsFromFields, enrichFieldsWithSections, orderFieldsBySectionAndQuestion } from "@/lib/form-sections";
import { firebaseAuth } from "@/lib/firebase-client";
import { DEFAULT_THEME, THEMES } from "@/lib/theme";
import { authHeader, useAuthUser } from "@/lib/use-auth-user";
import { cn } from "@/lib/utils";
import { FormField, FormRecord, FormSection, FormThemeId } from "@/lib/types";

interface SaveModalState {
  open: boolean;
  publicUrl: string;
  manageUrl: string;
}

type SaveState = "saved" | "dirty" | "saving" | "local" | "error";

interface DraftPayload {
  title: string;
  description: string;
  themeId: FormThemeId;
  sections: FormSection[];
  fields: FormField[];
}

function newSection(index: number): FormSection {
  return {
    id: crypto.randomUUID(),
    title: `Section ${index}`,
    description: "",
  };
}

function newField(type: FormField["type"], sectionId: string): FormField {
  const base = {
    id: crypto.randomUUID(),
    sectionId,
    label: "",
    required: true,
  };

  if (type === "image") {
    return {
      ...base,
      type,
      required: false,
      imageUrl: "",
    };
  }

  if (type === "multiple_choice") {
    return {
      ...base,
      type,
      options: ["", ""],
    };
  }

  if (type === "checkbox") {
    return {
      ...base,
      type,
      required: false,
      options: ["", ""],
      minSelections: 0,
      maxSelections: 2,
    };
  }

  if (type === "rating") {
    return {
      ...base,
      type,
      maxRating: 5,
    };
  }

  return {
    ...base,
    type,
    placeholder: "",
  };
}

function statusLabel(state: SaveState): string {
  if (state === "saving") {
    return "Saving...";
  }
  if (state === "dirty") {
    return "Unsaved changes";
  }
  if (state === "local") {
    return "Draft saved locally";
  }
  if (state === "error") {
    return "Save failed";
  }
  return "All changes saved";
}

export default function CreateFormPage() {
  const { user, loading: authLoading } = useAuthUser();
  const [queryReady, setQueryReady] = useState(false);
  const [editFormId, setEditFormId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [themeId, setThemeId] = useState<FormThemeId>(DEFAULT_THEME);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [origin, setOrigin] = useState("");
  const [formId, setFormId] = useState<string | null>(null);
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [loadingEditor, setLoadingEditor] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveModal, setSaveModal] = useState<SaveModalState>({
    open: false,
    publicUrl: "",
    manageUrl: "",
  });

  const initializedRef = useRef(false);
  const lastSavedSnapshotRef = useRef("");

  const selectedTheme = useMemo(() => THEMES[themeId], [themeId]);

  const draftKey = user ? `formsbetter-draft-${user.uid}` : null;

  const snapshot = useMemo(
    () => JSON.stringify({ title, description, themeId, sections, fields }),
    [title, description, themeId, sections, fields]
  );

  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0] ?? null;

  const sectionFields = useMemo(() => {
    if (!activeSection) {
      return [];
    }
    return fields.filter((field) => field.sectionId === activeSection.id);
  }, [activeSection, fields]);

  useEffect(() => {
    setOrigin(window.location.origin);
    const params = new URLSearchParams(window.location.search);
    setEditFormId(params.get("edit"));
    setQueryReady(true);
  }, []);

  useEffect(() => {
    async function initializeEditor() {
      if (!user || authLoading || !queryReady) {
        return;
      }

      setLoadingEditor(true);
      setError(null);

      try {
        if (editFormId) {
          const headers = await authHeader(user);
          const response = await fetch(`/api/forms/${editFormId}`, { headers });
          const data = (await response.json()) as { form?: FormRecord; error?: string };

          if (!response.ok || !data.form) {
            throw new Error(data.error || "Could not load form");
          }

          const nextFields = orderFieldsBySectionAndQuestion(data.form.fields || []);
          const nextSections = deriveSectionsFromFields(nextFields);

          setFormId(data.form.id);
          setShortCode(data.form.short_code);
          setTitle(data.form.title || "");
          setDescription(data.form.description || "");
          setThemeId(data.form.theme_id || DEFAULT_THEME);
          setSections(nextSections);
          setActiveSectionId(nextSections[0]?.id || "");
          setFields(nextFields);

          const nextSnapshot = JSON.stringify({
            title: data.form.title || "",
            description: data.form.description || "",
            themeId: data.form.theme_id || DEFAULT_THEME,
            sections: nextSections,
            fields: nextFields,
          });

          lastSavedSnapshotRef.current = nextSnapshot;
          setSaveState("saved");
        } else {
          let payload: DraftPayload | null = null;
          if (draftKey) {
            const raw = window.localStorage.getItem(draftKey);
            if (raw) {
              try {
                payload = JSON.parse(raw) as DraftPayload;
              } catch {
                payload = null;
              }
            }
          }

          if (payload && Array.isArray(payload.sections) && Array.isArray(payload.fields)) {
            setTitle(payload.title || "");
            setDescription(payload.description || "");
            setThemeId(payload.themeId || DEFAULT_THEME);
            setSections(payload.sections.length ? payload.sections : [newSection(1)]);
            setActiveSectionId(payload.sections[0]?.id || "");
            setFields(payload.fields.length ? payload.fields : [newField("short_text", payload.sections[0]?.id || newSection(1).id)]);
            lastSavedSnapshotRef.current = JSON.stringify(payload);
            setSaveState("local");
          } else {
            const section = newSection(1);
            const initialFields = [newField("short_text", section.id)];
            const initial = {
              title: "",
              description: "",
              themeId: DEFAULT_THEME,
              sections: [section],
              fields: initialFields,
            };
            setTitle(initial.title);
            setDescription(initial.description);
            setThemeId(initial.themeId);
            setSections(initial.sections);
            setActiveSectionId(section.id);
            setFields(initial.fields);
            lastSavedSnapshotRef.current = JSON.stringify(initial);
            setSaveState("saved");
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize editor");
      } finally {
        initializedRef.current = true;
        setLoadingEditor(false);
      }
    }

    void initializeEditor();
  }, [authLoading, draftKey, editFormId, queryReady, user]);

  const persistRemote = useCallback(async () => {
    if (!user) {
      return null;
    }

    const headers = await authHeader(user);
    const method = formId ? "PUT" : "POST";
    const endpoint = formId ? `/api/forms/${formId}` : "/api/forms";

    const response = await fetch(endpoint, {
      method,
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: title.trim() || "Untitled form",
        description: description.trim(),
        themeId,
        sections,
        fields: enrichFieldsWithSections(fields, sections).map((field) => ({
          ...field,
          label: field.label.trim(),
          placeholder: field.placeholder?.trim() || "",
          options: Array.isArray(field.options)
            ? field.options.map((option) => option.trim()).filter(Boolean)
            : undefined,
        })),
      }),
    });

    const data = (await response.json()) as {
      form?: { id: string; short_code: string };
      error?: string;
    };

    if (!response.ok || !data.form) {
      throw new Error(data.error || "Could not save form");
    }

    setFormId(data.form.id);
    setShortCode(data.form.short_code);
    return data.form;
  }, [description, fields, formId, sections, themeId, title, user]);

  useEffect(() => {
    if (!initializedRef.current || loadingEditor) {
      return;
    }

    if (snapshot === lastSavedSnapshotRef.current) {
      if (saveState === "dirty") {
        setSaveState("saved");
      }
      return;
    }

    setSaveState("dirty");

    const timeout = window.setTimeout(async () => {
      try {
        setSaveState("saving");

        if (formId) {
          await persistRemote();
          lastSavedSnapshotRef.current = snapshot;
          setSaveState("saved");
        } else {
          if (draftKey) {
            window.localStorage.setItem(
              draftKey,
              JSON.stringify({ title, description, themeId, sections, fields })
            );
          }
          lastSavedSnapshotRef.current = snapshot;
          setSaveState("local");
        }
      } catch {
        setSaveState("error");
      }
    }, 2300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    description,
    draftKey,
    fields,
    formId,
    loadingEditor,
    saveState,
    sections,
    snapshot,
    themeId,
    title,
    persistRemote,
  ]);

  const addSection = () => {
    const section = newSection(sections.length + 1);
    setSections((prev) => [...prev, section]);
    setActiveSectionId(section.id);
  };

  const updateSection = (sectionId: string, patch: Partial<FormSection>) => {
    setSections((prev) =>
      prev.map((section) => (section.id === sectionId ? { ...section, ...patch } : section))
    );
  };

  const removeSection = (sectionId: string) => {
    if (sections.length <= 1) {
      setError("At least one section is required.");
      return;
    }

    const nextSections = sections.filter((section) => section.id !== sectionId);
    const fallback = nextSections[0];

    setSections(nextSections);
    setFields((prev) =>
      prev.map((field) =>
        field.sectionId === sectionId
          ? {
              ...field,
              sectionId: fallback.id,
            }
          : field
      )
    );

    if (activeSectionId === sectionId) {
      setActiveSectionId(fallback.id);
    }
  };

  const addField = (type: FormField["type"]) => {
    if (!activeSection) {
      return;
    }

    const next = newField(type, activeSection.id);
    setFields((prev) => [...prev, next]);
  };

  const updateField = (fieldId: string, patch: Partial<FormField>) => {
    setFields((prev) =>
      prev.map((field) => (field.id === fieldId ? { ...field, ...patch } : field))
    );
  };

  const removeField = (fieldId: string) => {
    setFields((prev) => prev.filter((field) => field.id !== fieldId));
  };

  const duplicateField = (fieldId: string) => {
    setFields((prev) => {
      const index = prev.findIndex((field) => field.id === fieldId);
      if (index === -1) {
        return prev;
      }

      const clone: FormField = {
        ...prev[index],
        id: crypto.randomUUID(),
      };

      const next = [...prev];
      next.splice(index + 1, 0, clone);
      return next;
    });
  };

  const reorderSectionFields = (reordered: FormField[]) => {
    if (!activeSection) {
      return;
    }

    setFields((prev) => {
      const groupedBySection = new Map<string, FormField[]>();

      for (const section of sections) {
        groupedBySection.set(section.id, []);
      }

      for (const field of prev) {
        const sectionId = field.sectionId || sections[0]?.id;
        if (!sectionId) {
          continue;
        }

        const list = groupedBySection.get(sectionId) ?? [];
        list.push(field);
        groupedBySection.set(sectionId, list);
      }

      groupedBySection.set(activeSection.id, reordered);

      const flattened: FormField[] = [];
      for (const section of sections) {
        const sectionItems = groupedBySection.get(section.id) ?? [];
        flattened.push(...sectionItems);
      }

      return flattened;
    });
  };

  const addChoice = (fieldId: string) => {
    setFields((prev) =>
      prev.map((field) => {
        if (field.id !== fieldId || !Array.isArray(field.options)) {
          return field;
        }

        return {
          ...field,
          options: [...field.options, ""],
        };
      })
    );
  };

  const updateChoice = (fieldId: string, index: number, value: string) => {
    setFields((prev) =>
      prev.map((field) => {
        if (field.id !== fieldId || !Array.isArray(field.options)) {
          return field;
        }

        const options = [...field.options];
        options[index] = value;
        return {
          ...field,
          options,
        };
      })
    );
  };

  const removeChoice = (fieldId: string, index: number) => {
    setFields((prev) =>
      prev.map((field) => {
        if (field.id !== fieldId || !Array.isArray(field.options) || field.options.length <= 2) {
          return field;
        }

        return {
          ...field,
          options: field.options.filter((_, optionIndex) => optionIndex !== index),
        };
      })
    );
  };

  const handleImageUpload = async (fieldId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) {
      return;
    }

    setError(null);
    setUploadingFieldId(fieldId);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const headers = await authHeader(user);

      const response = await fetch("/api/uploads", {
        method: "POST",
        headers,
        body: formData,
      });

      const data = (await response.json()) as {
        imageUrl?: string;
        storagePath?: string;
        error?: string;
      };

      if (!response.ok || !data.imageUrl) {
        throw new Error(data.error || "Upload failed");
      }

      updateField(fieldId, {
        imageUrl: data.imageUrl,
        storagePath: data.storagePath,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingFieldId(null);
      event.target.value = "";
    }
  };

  const validateBeforeSave = (): string | null => {
    if (!title.trim()) {
      return "Form title is required.";
    }

    if (sections.some((section) => !section.title.trim())) {
      return "Every section needs a title.";
    }

    if (fields.length === 0) {
      return "Add at least one field.";
    }

    for (const field of fields) {
      if (!field.label.trim()) {
        return "Every question needs a title.";
      }

      if (field.type === "image" && !field.imageUrl) {
        return "Every image block needs an uploaded image.";
      }

      if ((field.type === "multiple_choice" || field.type === "checkbox") && Array.isArray(field.options)) {
        const clean = field.options.map((option) => option.trim()).filter(Boolean);
        if (clean.length < 2) {
          return "Choice-based fields need at least two options.";
        }
      }

      if (field.type === "checkbox") {
        const min = field.minSelections ?? 0;
        const max = field.maxSelections ?? 1;
        const optionCount = field.options?.map((option) => option.trim()).filter(Boolean).length ?? 0;

        if (min < 0 || max < 1 || min > max) {
          return "Checkbox min/max values are invalid.";
        }

        if (max > optionCount) {
          return "Checkbox max selections cannot exceed option count.";
        }
      }

      if (field.type === "rating") {
        const maxRating = field.maxRating ?? 0;
        if (!Number.isInteger(maxRating) || maxRating < 2 || maxRating > 10) {
          return "Rating max must be between 2 and 10.";
        }
      }
    }

    return null;
  };

  const saveForm = async () => {
    if (!user) {
      return;
    }

    const validationError = validateBeforeSave();
    if (validationError) {
      setError(validationError);
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      setSaveState("saving");
      const form = await persistRemote();

      const currentSnapshot = JSON.stringify({ title, description, themeId, sections, fields });
      lastSavedSnapshotRef.current = currentSnapshot;
      setSaveState("saved");

      if (draftKey) {
        window.localStorage.removeItem(draftKey);
      }

      const baseOrigin = origin || window.location.origin;
      const liveShortCode = form?.short_code || shortCode || "";

      setSaveModal({
        open: true,
        publicUrl: `${baseOrigin}/f/${liveShortCode}`,
        manageUrl: `${baseOrigin}/r/${form?.id || formId || ""}`,
      });
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : "Failed to save form");
    } finally {
      setPublishing(false);
    }
  };

  if (authLoading || loadingEditor) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
          Loading editor...
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="grain-layer flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_12%_10%,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_84%_16%,rgba(249,115,22,0.16),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] px-4 py-10">
        <AuthPanel title="Sign in to build forms" subtitle="Forms are private to your account." />
      </main>
    );
  }

  return (
    <main className={cn("grain-layer min-h-screen px-4 py-8 sm:px-6 sm:py-10", selectedTheme.canvasClass)}>
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <section className="space-y-5">
          <div className="rounded-2xl border border-white/25 bg-black/25 p-4 text-white shadow-xl backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href="/" className="text-sm font-semibold text-white/80 transition hover:text-white">
                  Back to dashboard
                </Link>
                <p className="mt-1 text-xs text-white/70">{formId ? "Editing form" : "New form"} • {statusLabel(saveState)}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (firebaseAuth) {
                      void signOut(firebaseAuth);
                    }
                  }}
                  className="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  Sign out
                </button>
                <button
                  type="button"
                  onClick={saveForm}
                  disabled={publishing}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/95 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:opacity-60"
                >
                  {publishing ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
                  {publishing ? "Saving..." : "Save form"}
                </button>
              </div>
            </div>
          </div>

          <section className={cn("rounded-3xl border bg-white/85 p-5 shadow-lg backdrop-blur", selectedTheme.borderClass)}>
            <div className={cn("rounded-2xl p-6 text-white", selectedTheme.heroClass)}>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Untitled form"
                className="w-full bg-transparent text-3xl font-semibold tracking-tight text-white outline-none placeholder:text-white/70"
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Form description (optional)"
                className="mt-3 min-h-20 w-full resize-y bg-transparent text-sm text-white/90 outline-none placeholder:text-white/70"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-white/35 bg-white/88 p-4 shadow">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Sections</p>
              <button
                type="button"
                onClick={addSection}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                <Plus size={13} /> Add section
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSectionId(section.id)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold",
                    activeSection?.id === section.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  )}
                >
                  {section.title || "Untitled section"}
                </button>
              ))}
            </div>

            {activeSection ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <input
                    value={activeSection.title}
                    onChange={(event) => updateSection(activeSection.id, { title: event.target.value })}
                    placeholder="Section title"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  />
                  <input
                    value={activeSection.description || ""}
                    onChange={(event) => updateSection(activeSection.id, { description: event.target.value })}
                    placeholder="Section description"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeSection(activeSection.id)}
                  className="h-fit rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                >
                  Remove
                </button>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-white/35 bg-white/88 p-4 shadow">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              <Palette size={14} /> Theme
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {(Object.keys(THEMES) as FormThemeId[]).map((id) => {
                const theme = THEMES[id];
                const active = id === themeId;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setThemeId(id)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition",
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                      <span className="text-sm font-semibold">{theme.name}</span>
                    </div>
                    <p className={cn("mt-1 text-xs", active ? "text-white/70" : "text-slate-500")}>{theme.mood}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-white/35 bg-white/88 p-4 shadow">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              Questions in {activeSection?.title || "Current section"}
            </p>

            {sectionFields.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No questions in this section yet. Use the field toolkit to add one.
              </div>
            ) : (
              <Reorder.Group axis="y" values={sectionFields} onReorder={reorderSectionFields} className="space-y-3">
                {sectionFields.map((field) => (
                  <Reorder.Item key={field.id} value={field} className="list-none">
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-start gap-2">
                        <input
                          value={field.label}
                          onChange={(event) => updateField(field.id, { label: event.target.value })}
                          placeholder="Question title"
                          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => duplicateField(field.id)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => removeField(field.id)}
                          disabled={fields.length <= 1}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-30"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {field.type === "short_text" || field.type === "paragraph" ? (
                        <input
                          value={field.placeholder || ""}
                          onChange={(event) => updateField(field.id, { placeholder: event.target.value })}
                          placeholder="Input placeholder"
                          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
                        />
                      ) : null}

                      {(field.type === "multiple_choice" || field.type === "checkbox") && Array.isArray(field.options) ? (
                        <div className="mt-3 space-y-2">
                          {field.options.map((option, index) => (
                            <div key={`${field.id}-${index}`} className="flex gap-2">
                              <input
                                value={option}
                                onChange={(event) => updateChoice(field.id, index, event.target.value)}
                                placeholder={`Choice ${index + 1}`}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                              />
                              <button
                                type="button"
                                onClick={() => removeChoice(field.id, index)}
                                disabled={field.options!.length <= 2}
                                className="rounded-lg border border-slate-200 px-2 py-2 text-slate-500 disabled:opacity-30"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addChoice(field.id)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            Add option
                          </button>
                        </div>
                      ) : null}

                      {field.type === "checkbox" ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <input
                            type="number"
                            min={0}
                            value={field.minSelections ?? 0}
                            onChange={(event) =>
                              updateField(field.id, {
                                minSelections: Number.parseInt(event.target.value || "0", 10) || 0,
                              })
                            }
                            placeholder="Min selections"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          />
                          <input
                            type="number"
                            min={1}
                            value={field.maxSelections ?? 2}
                            onChange={(event) =>
                              updateField(field.id, {
                                maxSelections: Number.parseInt(event.target.value || "1", 10) || 1,
                              })
                            }
                            placeholder="Max selections"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          />
                        </div>
                      ) : null}

                      {field.type === "rating" ? (
                        <div className="mt-3">
                          <input
                            type="number"
                            min={2}
                            max={10}
                            value={field.maxRating ?? 5}
                            onChange={(event) =>
                              updateField(field.id, {
                                maxRating: Math.min(
                                  10,
                                  Math.max(2, Number.parseInt(event.target.value || "5", 10) || 5)
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          />
                          <div className="mt-2 flex gap-1">
                            {Array.from({ length: field.maxRating ?? 5 }).map((_, index) => (
                              <Star key={`${field.id}-star-${index}`} size={15} className="text-amber-400" />
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {field.type === "image" ? (
                        <div className="mt-3">
                          {field.imageUrl ? (
                            <Image
                              src={field.imageUrl}
                              alt={field.label || "Uploaded image"}
                              width={1000}
                              height={500}
                              className="max-h-72 w-full rounded-lg object-cover"
                            />
                          ) : (
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                              {uploadingFieldId === field.id ? (
                                <LoaderCircle size={15} className="animate-spin" />
                              ) : (
                                <ImageIcon size={15} />
                              )}
                              Upload image
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif"
                                className="hidden"
                                onChange={(event) => {
                                  void handleImageUpload(field.id, event);
                                }}
                              />
                            </label>
                          )}
                        </div>
                      ) : null}

                      {field.type !== "image" ? (
                        <label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(event) => updateField(field.id, { required: event.target.checked })}
                          />
                          Required answer
                        </label>
                      ) : null}
                    </section>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}
          </section>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              Field Toolkit
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => addField("short_text")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><Type size={16} />Short text</button>
              <button type="button" onClick={() => addField("paragraph")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><Text size={16} />Paragraph</button>
              <button type="button" onClick={() => addField("multiple_choice")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><ListChecks size={16} />Single choice</button>
              <button type="button" onClick={() => addField("checkbox")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><CheckSquare size={16} />Multi choice</button>
              <button type="button" onClick={() => addField("rating")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><Gauge size={16} />Rating</button>
              <button type="button" onClick={() => addField("image")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"><ImageIcon size={16} />Image</button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/25 bg-black/40 p-5 text-white shadow-xl backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Live Snapshot</p>
            <h3 className="mt-2 text-xl font-semibold">{title || "Untitled form"}</h3>
            <p className="mt-2 text-sm text-white/75">{description || "No description"}</p>

            <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-white/20 bg-white/10 p-3">
                <p className="text-white/60">Sections</p>
                <p className="mt-1 text-lg font-semibold">{sections.length}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 p-3">
                <p className="text-white/60">Questions</p>
                <p className="mt-1 text-lg font-semibold">{fields.length}</p>
              </div>
            </div>

            <p className="mt-5 text-xs text-white/65">Autosave runs every few seconds only when changes are detected.</p>
          </section>
        </aside>
      </div>

      {saveModal.open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8"
        >
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            className="w-full max-w-2xl rounded-2xl border border-white/35 bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-slate-900">Form saved</h2>
              <button
                type="button"
                onClick={() =>
                  setSaveModal({
                    open: false,
                    publicUrl: "",
                    manageUrl: "",
                  })
                }
                className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-[210px_1fr]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">QR Share</p>
                <div className="rounded-lg bg-white p-2">
                  <QRCodeSVG value={saveModal.publicUrl} size={185} level="H" />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Public form link</p>
                  <div className="flex rounded-lg border border-slate-200 bg-slate-50">
                    <input readOnly value={saveModal.publicUrl} className="w-full bg-transparent px-3 py-2 text-xs font-medium text-slate-700 outline-none sm:text-sm" />
                    <button type="button" onClick={() => { void navigator.clipboard.writeText(saveModal.publicUrl); }} className="inline-flex items-center gap-1 border-l border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
                      <Copy size={14} />
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Results link</p>
                  <div className="flex rounded-lg border border-slate-200 bg-slate-50">
                    <input readOnly value={saveModal.manageUrl} className="w-full bg-transparent px-3 py-2 text-xs font-medium text-slate-700 outline-none sm:text-sm" />
                    <button type="button" onClick={() => { void navigator.clipboard.writeText(saveModal.manageUrl); }} className="inline-flex items-center gap-1 border-l border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
                      <Copy size={14} />
                      Copy
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                    Dashboard
                  </Link>
                  <a href={saveModal.manageUrl} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
                    <Check size={14} />
                    Open results
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </main>
  );
}
