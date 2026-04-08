import { FormThemeId } from "@/lib/types";

export const THEMES: Record<
  FormThemeId,
  {
    name: string;
    mood: string;
    accent: string;
    softBg: string;
    canvasClass: string;
    heroClass: string;
    borderClass: string;
    ringClass: string;
  }
> = {
  orchid: {
    name: "Orchid Studio",
    mood: "Dreamy and editorial",
    accent: "#6d28d9",
    softBg: "#f5f3ff",
    canvasClass:
      "bg-[radial-gradient(circle_at_15%_15%,rgba(167,139,250,0.22),transparent_26%),radial-gradient(circle_at_86%_12%,rgba(45,212,191,0.16),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]",
    heroClass:
      "bg-[radial-gradient(circle_at_top_left,#4338ca_0%,#6d28d9_36%,#7c3aed_100%)]",
    borderClass: "border-violet-300",
    ringClass: "focus:ring-violet-400/45",
  },
  ocean: {
    name: "Ocean Pulse",
    mood: "Calm and airy",
    accent: "#0d9488",
    softBg: "#ecfeff",
    canvasClass:
      "bg-[radial-gradient(circle_at_10%_12%,rgba(45,212,191,0.2),transparent_26%),radial-gradient(circle_at_85%_8%,rgba(14,165,233,0.2),transparent_24%),linear-gradient(180deg,#ecfeff_0%,#f8fafc_100%)]",
    heroClass:
      "bg-[radial-gradient(circle_at_top_left,#0f766e_0%,#0d9488_35%,#0ea5e9_100%)]",
    borderClass: "border-teal-300",
    ringClass: "focus:ring-teal-400/45",
  },
  sunset: {
    name: "Sunset Paper",
    mood: "Warm and handcrafted",
    accent: "#ea580c",
    softBg: "#fff7ed",
    canvasClass:
      "bg-[radial-gradient(circle_at_12%_14%,rgba(251,146,60,0.24),transparent_28%),radial-gradient(circle_at_84%_10%,rgba(250,204,21,0.2),transparent_24%),linear-gradient(180deg,#fff7ed_0%,#ffedd5_100%)]",
    heroClass:
      "bg-[radial-gradient(circle_at_top_left,#9a3412_0%,#c2410c_36%,#ea580c_100%)]",
    borderClass: "border-orange-300",
    ringClass: "focus:ring-orange-400/45",
  },
  midnight: {
    name: "Midnight Chrome",
    mood: "Noir and cinematic",
    accent: "#38bdf8",
    softBg: "#0f172a",
    canvasClass:
      "bg-[radial-gradient(circle_at_14%_16%,rgba(56,189,248,0.22),transparent_26%),radial-gradient(circle_at_82%_6%,rgba(99,102,241,0.2),transparent_26%),linear-gradient(180deg,#0b1120_0%,#111827_100%)]",
    heroClass:
      "bg-[radial-gradient(circle_at_top_left,#0f172a_0%,#111827_36%,#1e293b_100%)]",
    borderClass: "border-sky-300/50",
    ringClass: "focus:ring-sky-400/45",
  },
  lagoon: {
    name: "Lagoon Neon",
    mood: "Vibrant and kinetic",
    accent: "#06b6d4",
    softBg: "#083344",
    canvasClass:
      "bg-[radial-gradient(circle_at_12%_12%,rgba(6,182,212,0.28),transparent_28%),radial-gradient(circle_at_84%_8%,rgba(16,185,129,0.24),transparent_26%),linear-gradient(180deg,#05283a_0%,#0c4a6e_100%)]",
    heroClass:
      "bg-[radial-gradient(circle_at_top_left,#164e63_0%,#155e75_36%,#0f766e_100%)]",
    borderClass: "border-cyan-300/50",
    ringClass: "focus:ring-cyan-400/45",
  },
  dune: {
    name: "Dune Flux",
    mood: "Moody desert wave",
    accent: "#f97316",
    softBg: "#7c2d12",
    canvasClass:
      "bg-[radial-gradient(circle_at_11%_12%,rgba(249,115,22,0.26),transparent_28%),radial-gradient(circle_at_87%_9%,rgba(245,158,11,0.22),transparent_26%),linear-gradient(180deg,#431407_0%,#78350f_100%)]",
    heroClass:
      "bg-[radial-gradient(circle_at_top_left,#7c2d12_0%,#9a3412_35%,#7c2d12_100%)]",
    borderClass: "border-orange-300/50",
    ringClass: "focus:ring-orange-400/45",
  },
};

export const DEFAULT_THEME: FormThemeId = "orchid";
