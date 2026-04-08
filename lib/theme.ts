import { FormThemeId } from "@/lib/types";

export const THEMES: Record<
  FormThemeId,
  {
    name: string;
    accent: string;
    softBg: string;
    heroClass: string;
    borderClass: string;
  }
> = {
  orchid: {
    name: "Orchid Studio",
    accent: "#6d28d9",
    softBg: "#f5f3ff",
    heroClass:
      "bg-[radial-gradient(circle_at_top_left,#ddd6fe_0%,#f5f3ff_35%,#fafaf9_100%)]",
    borderClass: "border-violet-300",
  },
  ocean: {
    name: "Ocean Pulse",
    accent: "#0d9488",
    softBg: "#ecfeff",
    heroClass:
      "bg-[radial-gradient(circle_at_top_left,#99f6e4_0%,#ccfbf1_35%,#f8fafc_100%)]",
    borderClass: "border-teal-300",
  },
  sunset: {
    name: "Sunset Paper",
    accent: "#ea580c",
    softBg: "#fff7ed",
    heroClass:
      "bg-[radial-gradient(circle_at_top_left,#fed7aa_0%,#ffedd5_35%,#fafaf9_100%)]",
    borderClass: "border-orange-300",
  },
};

export const DEFAULT_THEME: FormThemeId = "orchid";
