export type FormThemeId =
  | "orchid"
  | "ocean"
  | "sunset"
  | "midnight"
  | "lagoon"
  | "dune";

export type FormFieldType =
  | "short_text"
  | "paragraph"
  | "image"
  | "multiple_choice"
  | "checkbox"
  | "rating";

export interface FormSection {
  id: string;
  title: string;
  description?: string;
}

export type FormAnswerValue = string | string[] | number;

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  sectionId?: string;
  sectionTitle?: string;
  sectionDescription?: string;
  sectionOrder?: number;
  questionOrder?: number;
  placeholder?: string;
  imageUrl?: string;
  storagePath?: string;
  options?: string[];
  minSelections?: number;
  maxSelections?: number;
  maxRating?: number;
}

export interface FormRecord {
  id: string;
  title: string;
  description: string;
  short_code: string;
  theme_id: FormThemeId;
  created_at: string;
  fields: FormField[];
  sections?: FormSection[];
}

export interface FormResponseRecord {
  id: string;
  form_id: string;
  answers: Record<string, FormAnswerValue>;
  created_at: string;
}
