"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import {
  Check,
  Copy,
  ImageIcon,
  LoaderCircle,
  PlusCircle,
  Save,
  Text,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { getOrCreateCreatorToken } from "@/lib/creator-token";
import { cn } from "@/lib/utils";
import { DEFAULT_THEME, THEMES } from "@/lib/theme";
import { FormField, FormThemeId } from "@/lib/types";

interface SaveModalState {
  open: boolean;
  publicUrl: string;
  manageUrl: string;
}

function newField(type: FormField["type"]): FormField {
  if (type === "image") {
    return {
      id: crypto.randomUUID(),
      type,
      label: "Image block",
      required: false,
      imageUrl: "",
    };
  }

  return {
    id: crypto.randomUUID(),
    type,
    label: type === "paragraph" ? "Long answer question" : "Short answer question",
    placeholder: type === "paragraph" ? "Type your answer" : "Short answer",
    required: true,
  };
}

export default function CreateFormPage() {
  const [title, setTitle] = useState("Untitled form");
  const [description, setDescription] = useState("Tell us what you think. This will only take 2 minutes.");
  const [themeId, setThemeId] = useState<FormThemeId>(DEFAULT_THEME);
  const [fields, setFields] = useState<FormField[]>([newField("short_text")]);
  const [creatorToken, setCreatorToken] = useState("");
  const [origin, setOrigin] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingFieldId, setUploadingFieldId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveModal, setSaveModal] = useState<SaveModalState>({
    open: false,
    publicUrl: "",
    manageUrl: "",
  });

  useEffect(() => {
    setCreatorToken(getOrCreateCreatorToken());
    setOrigin(window.location.origin);
  }, []);

  const selectedTheme = useMemo(() => THEMES[themeId], [themeId]);

  const updateField = (fieldId: string, patch: Partial<FormField>) => {
    setFields((prev) =>
      prev.map((field) => (field.id === fieldId ? { ...field, ...patch } : field))
    );
  };

  const removeField = (fieldId: string) => {
    setFields((prev) => prev.filter((field) => field.id !== fieldId));
  };

  const addField = (type: FormField["type"]) => {
    setFields((prev) => [...prev, newField(type)]);
  };

  const handleImageUpload = async (
    fieldId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!creatorToken) {
      setError("Creator token not ready yet. Refresh and retry.");
      return;
    }

    setError(null);
    setUploadingFieldId(fieldId);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/uploads", {
        method: "POST",
        headers: {
          "x-creator-token": creatorToken,
        },
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

  const saveForm = async () => {
    if (!creatorToken) {
      setError("Creator token not ready yet. Refresh and retry.");
      return;
    }

    if (fields.length === 0) {
      setError("Add at least one field");
      return;
    }

    if (fields.some((field) => !field.label.trim())) {
      setError("Every field needs a label");
      return;
    }

    if (fields.some((field) => field.type === "image" && !field.imageUrl)) {
      setError("Every image block needs an uploaded image");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/forms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creatorToken,
          title,
          description,
          themeId,
          fields,
        }),
      });

      const data = (await response.json()) as {
        form?: { id: string; short_code: string };
        error?: string;
      };

      if (!response.ok || !data.form) {
        throw new Error(data.error || "Failed to save form");
      }

      const baseOrigin = origin || window.location.origin;
      const publicUrl = `${baseOrigin}/f/${data.form.short_code}`;
      const manageUrl = `${baseOrigin}/r/${data.form.id}?key=${creatorToken}`;

      setSaveModal({
        open: true,
        publicUrl,
        manageUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save form");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white/85 px-5 py-4 shadow-sm backdrop-blur">
          <Link href="/" className="text-sm font-semibold text-slate-700 transition hover:text-slate-950">
            Back to dashboard
          </Link>

          <button
            type="button"
            onClick={saveForm}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Publishing..." : "Publish form"}
          </button>
        </div>

        <section className={cn("rounded-3xl border bg-white p-6 shadow-sm sm:p-8", selectedTheme.borderClass)}>
          <div className={cn("rounded-2xl p-6 sm:p-8", selectedTheme.heroClass)}>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full bg-transparent text-3xl font-semibold tracking-tight text-slate-900 outline-none sm:text-4xl"
              placeholder="Form title"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-4 min-h-20 w-full resize-y bg-transparent text-sm text-slate-700 outline-none sm:text-base"
              placeholder="Form description"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {(Object.keys(THEMES) as FormThemeId[]).map((id) => {
              const theme = THEMES[id];

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setThemeId(id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    id === themeId
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: theme.accent }}
                  />
                  {theme.name}
                </button>
              );
            })}
          </div>
        </section>

        {fields.map((field) => (
          <section
            key={field.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <input
                  value={field.label}
                  onChange={(event) => updateField(field.id, { label: event.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="Question label"
                />

                {field.type !== "image" && (
                  <input
                    value={field.placeholder || ""}
                    onChange={(event) =>
                      updateField(field.id, { placeholder: event.target.value })
                    }
                    className="mt-2 w-full rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-600 outline-none transition focus:border-slate-300"
                    placeholder="Placeholder text"
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => removeField(field.id)}
                disabled={fields.length === 1}
                className="rounded-md border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {field.type === "image" ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-5">
                {field.imageUrl ? (
                  <div className="space-y-4">
                    <Image
                      src={field.imageUrl}
                      alt={field.label}
                      width={1200}
                      height={500}
                      className="max-h-72 w-full rounded-lg border border-slate-200 object-cover"
                    />
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                      Replace image
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={(event) => {
                          void handleImageUpload(field.id, event);
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg bg-slate-50 px-4 py-7 text-center text-sm text-slate-600 transition hover:bg-slate-100">
                    {uploadingFieldId === field.id ? (
                      <LoaderCircle size={18} className="animate-spin" />
                    ) : (
                      <ImageIcon size={18} />
                    )}
                    Upload an image block
                    <span className="text-xs text-slate-500">PNG, JPG, WEBP or GIF. Max 5MB.</span>
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
            ) : field.type === "paragraph" ? (
              <textarea
                disabled
                rows={3}
                className="mt-4 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400"
                value={field.placeholder || "Long answer"}
              />
            ) : (
              <input
                disabled
                className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400"
                value={field.placeholder || "Short answer"}
              />
            )}

            {field.type !== "image" && (
              <label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(event) => updateField(field.id, { required: event.target.checked })}
                />
                Required
              </label>
            )}
          </section>
        ))}

        <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
          <button
            type="button"
            onClick={() => addField("short_text")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Type size={16} />
            Add short text
          </button>
          <button
            type="button"
            onClick={() => addField("paragraph")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Text size={16} />
            Add paragraph
          </button>
          <button
            type="button"
            onClick={() => addField("image")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ImageIcon size={16} />
            Add image
          </button>
          <button
            type="button"
            onClick={() => addField("short_text")}
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            <PlusCircle size={16} />
            Quick add
          </button>
        </section>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
      </div>

      {saveModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
          <div className="w-full max-w-xl rounded-2xl border border-white/80 bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-slate-900">Form published</h2>
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

            <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  QR Share
                </p>
                <div className="rounded-lg bg-white p-2">
                  <QRCodeSVG value={saveModal.publicUrl} size={180} level="H" />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Public form link
                  </p>
                  <div className="flex rounded-lg border border-slate-200 bg-slate-50">
                    <input
                      readOnly
                      value={saveModal.publicUrl}
                      className="w-full bg-transparent px-3 py-2 text-xs font-medium text-slate-700 outline-none sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(saveModal.publicUrl);
                      }}
                      className="inline-flex items-center gap-1 border-l border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      <Copy size={14} />
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Results management link
                  </p>
                  <div className="flex rounded-lg border border-slate-200 bg-slate-50">
                    <input
                      readOnly
                      value={saveModal.manageUrl}
                      className="w-full bg-transparent px-3 py-2 text-xs font-medium text-slate-700 outline-none sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(saveModal.manageUrl);
                      }}
                      className="inline-flex items-center gap-1 border-l border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      <Copy size={14} />
                      Copy
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    Dashboard
                  </Link>
                  <a
                    href={saveModal.manageUrl}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    <Check size={14} />
                    Open results
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
