export type FormThemeId =
  | "orchid"
  | "ocean"
  | "sunset"
  | "midnight"
  | "lagoon"
  | "dune";

export type FormFieldType = "short_text" | "paragraph" | "image";

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  imageUrl?: string;
  storagePath?: string;
}

export interface FormRecord {
  id: string;
  title: string;
  description: string;
  short_code: string;
  theme_id: FormThemeId;
  created_at: string;
  fields: FormField[];
}

export interface FormResponseRecord {
  id: string;
  form_id: string;
  answers: Record<string, string>;
  created_at: string;
}
