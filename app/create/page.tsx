"use client";

import { ChangeEvent, PointerEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { motion, Reorder, useDragControls } from "framer-motion";
import {
  Check,
  Copy,
  GripVertical,
  ImageIcon,
  LoaderCircle,
  Palette,
  PlusCircle,
  Save,
  Text,
  Trash2,
  Type,
  Wand2,
  X,
} from "lucide-react";
import { getOrCreateCreatorToken } from "@/lib/creator-token";
import { DEFAULT_THEME, THEMES } from "@/lib/theme";
import { cn } from "@/lib/utils";
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
      label: "Visual block",
      required: false,
      imageUrl: "",
    };
  }

  return {
    id: crypto.randomUUID(),
    type,
    label: type === "paragraph" ? "Long-form question" : "Quick question",
    placeholder: type === "paragraph" ? "Type a detailed answer" : "Type your answer",
    required: true,
  };
}

interface FieldCardProps {
  field: FormField;
  fieldsCount: number;
  uploadingFieldId: string | null;
  onUpdate: (fieldId: string, patch: Partial<FormField>) => void;
  onRemove: (fieldId: string) => void;
  onUpload: (fieldId: string, event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onDuplicate: (fieldId: string) => void;
  theme: (typeof THEMES)[FormThemeId];
}

function FieldCard({
  field,
  fieldsCount,
  uploadingFieldId,
  onUpdate,
  onRemove,
  onUpload,
  onDuplicate,
  theme,
}: FieldCardProps) {
  const dragControls = useDragControls();

  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    dragControls.start(event);
  };

  return (
    <Reorder.Item
      value={field}
      id={field.id}
      dragListener={false}
      dragControls={dragControls}
      className="list-none"
      whileDrag={{ scale: 1.01, rotate: 0.25 }}
      transition={{ type: "spring", bounce: 0.12, duration: 0.25 }}
    >
      <motion.section
        layout
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="rounded-2xl border border-white/35 bg-white/85 p-4 shadow-md backdrop-blur-sm sm:p-5"
      >
        <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
          <button
            type="button"
            onPointerDown={startDrag}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
            aria-label="Drag field"
          >
            <GripVertical size={17} />
          </button>

          <div className="min-w-0 flex-1">
            <input
              value={field.label}
              onChange={(event) => onUpdate(field.id, { label: event.target.value })}
              placeholder="Question label"
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none ring-0 transition focus:ring-2",
                theme.ringClass
              )}
            />

            {field.type !== "image" && (
              <input
                value={field.placeholder || ""}
                onChange={(event) =>
                  onUpdate(field.id, { placeholder: event.target.value })
                }
                placeholder="Placeholder text"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none ring-0 transition focus:ring-2 focus:ring-slate-300/70"
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDuplicate(field.id)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => onRemove(field.id)}
              disabled={fieldsCount === 1}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {field.type === "image" ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4">
            {field.imageUrl ? (
              <div className="space-y-3">
                <Image
                  src={field.imageUrl}
                  alt={field.label || "Uploaded image"}
                  width={1200}
                  height={560}
                  className="max-h-80 w-full rounded-lg object-cover"
                />
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                  Replace image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) => {
                      void onUpload(field.id, event);
                    }}
                  />
                </label>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg bg-white px-4 py-6 text-center text-sm text-slate-600 transition hover:bg-slate-100">
                {uploadingFieldId === field.id ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <ImageIcon size={18} />
                )}
                Add an image to make this form more visual.
                <span className="text-xs text-slate-500">PNG, JPG, WEBP, GIF. Up to 5MB.</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => {
                    void onUpload(field.id, event);
                  }}
                />
              </label>
            )}
          </div>
        ) : field.type === "paragraph" ? (
          <textarea
            disabled
            rows={4}
            value={field.placeholder || "Long answer"}
            className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400"
          />
        ) : (
          <input
            disabled
            value={field.placeholder || "Short answer"}
            className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400"
          />
        )}

        {field.type !== "image" && (
          <label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(event) => onUpdate(field.id, { required: event.target.checked })}
            />
            Required answer
          </label>
        )}
      </motion.section>
    </Reorder.Item>
  );
}

export default function CreateFormPage() {
  const [title, setTitle] = useState("Night Signal Intake");
  const [description, setDescription] = useState(
    "Curate a unique response experience. Drag blocks, tune style, and publish in one click."
  );
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

  const duplicateField = (fieldId: string) => {
    setFields((prev) => {
      const index = prev.findIndex((field) => field.id === fieldId);
      if (index === -1) {
        return prev;
      }

      const source = prev[index];
      const clone: FormField = {
        ...source,
        id: crypto.randomUUID(),
      };

      const next = [...prev];
      next.splice(index + 1, 0, clone);
      return next;
    });
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

  const previewFieldCount = fields.filter((field) => field.type !== "image").length;

  return (
    <main className={cn("grain-layer min-h-screen px-4 py-8 sm:px-6 sm:py-10", selectedTheme.canvasClass)}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="blob-float absolute -left-20 top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="blob-float-slow absolute -right-20 top-24 h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.2fr,0.8fr]"
      >
        <section className="space-y-5">
          <div className="rounded-2xl border border-white/25 bg-black/25 p-4 text-white shadow-xl backdrop-blur md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/" className="text-sm font-semibold text-white/80 transition hover:text-white">
                Back to dashboard
              </Link>

              <button
                type="button"
                onClick={saveForm}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-white/95 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Publishing..." : "Publish form"}
              </button>
            </div>
          </div>

          <section className={cn("rounded-3xl border bg-white/80 p-5 shadow-lg backdrop-blur sm:p-7", selectedTheme.borderClass)}>
            <div className={cn("rounded-2xl p-6 text-white", selectedTheme.heroClass)}>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full bg-transparent text-3xl font-semibold tracking-tight text-white outline-none sm:text-4xl"
                placeholder="Form title"
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-4 min-h-20 w-full resize-y bg-transparent text-sm text-white/85 outline-none sm:text-base"
                placeholder="Form description"
              />
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              <Palette size={14} />
              Style Presets
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
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
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: theme.accent }}
                      />
                      <span className="text-sm font-semibold">{theme.name}</span>
                    </div>
                    <p className={cn("mt-1 text-xs", active ? "text-white/70" : "text-slate-500")}>
                      {theme.mood}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="rounded-2xl border border-white/25 bg-white/65 p-3 shadow-lg backdrop-blur-sm sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              <div className="inline-flex items-center gap-2">
                <Wand2 size={14} />
                Builder Canvas
              </div>
              <span>Drag cards to reorder</span>
            </div>

            <Reorder.Group
              axis="y"
              values={fields}
              onReorder={setFields}
              className="space-y-3"
            >
              {fields.map((field) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  fieldsCount={fields.length}
                  uploadingFieldId={uploadingFieldId}
                  onUpdate={updateField}
                  onRemove={removeField}
                  onUpload={handleImageUpload}
                  onDuplicate={duplicateField}
                  theme={selectedTheme}
                />
              ))}
            </Reorder.Group>
          </div>

          <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/25 bg-white/70 p-3 shadow-lg backdrop-blur-sm">
            <button
              type="button"
              onClick={() => addField("short_text")}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Type size={16} />
              Short text
            </button>
            <button
              type="button"
              onClick={() => addField("paragraph")}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Text size={16} />
              Paragraph
            </button>
            <button
              type="button"
              onClick={() => addField("image")}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ImageIcon size={16} />
              Image block
            </button>
            <button
              type="button"
              onClick={() => addField("short_text")}
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <PlusCircle size={16} />
              Add item
            </button>
          </section>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-6 lg:h-fit">
          <motion.section
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl border border-white/25 bg-black/40 p-5 text-white shadow-xl backdrop-blur"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              Live Snapshot
            </p>
            <h3 className="mt-2 text-xl font-semibold">{title || "Untitled form"}</h3>
            <p className="mt-2 text-sm text-white/75">{description || "No description"}</p>

            <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-white/20 bg-white/10 p-3">
                <p className="text-white/60">Questions</p>
                <p className="mt-1 text-lg font-semibold">{previewFieldCount}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 p-3">
                <p className="text-white/60">Visual blocks</p>
                <p className="mt-1 text-lg font-semibold">
                  {fields.filter((field) => field.type === "image").length}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {fields.slice(0, 4).map((field) => (
                <div key={field.id} className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs">
                  {field.label || "Untitled item"}
                </div>
              ))}
              {fields.length > 4 && (
                <div className="text-xs text-white/65">+ {fields.length - 4} more items</div>
              )}
            </div>

            <p className="mt-6 text-xs text-white/60">
              Tip: drag from the handle to reorder and shape your story-like flow.
            </p>
          </motion.section>
        </aside>
      </motion.div>

      {saveModal.open && (
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

            <div className="grid gap-5 sm:grid-cols-[210px_1fr]">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  QR Share
                </p>
                <div className="rounded-lg bg-white p-2">
                  <QRCodeSVG value={saveModal.publicUrl} size={185} level="H" />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
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
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Results link
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

                <div className="flex flex-wrap gap-2 pt-1">
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
          </motion.div>
        </motion.div>
      )}
    </main>
  );
}
