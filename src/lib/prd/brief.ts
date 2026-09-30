import type { Draft } from "./types";

export interface ResolvedBrief {
  platform: string;
  frontend: string;
  backend: string;
  database: string;
  style: string;
  themeMode: string;
  customThemeNote: string;
  font: string;
  colors: { primary: string; accent: string; background: string };
  name: string;
  category: string;
  description: string;
  notes: string;
}

const pick = (value: string, custom: string) =>
  value === "Custom" || value === "Custom platform" ? custom.trim() || value : value;

export function resolveBrief(draft: Draft): ResolvedBrief {
  return {
    platform: pick(draft.platform, draft.customPlatform),
    frontend: pick(draft.frontend, draft.customFrontend),
    backend: pick(draft.backend, draft.customBackend),
    database: pick(draft.database, draft.customDatabase),
    style: pick(draft.style, draft.customStyle),
    themeMode: draft.themeMode === "Custom" ? draft.customThemeNote.trim() || "Custom" : draft.themeMode,
    customThemeNote: draft.customThemeNote.trim(),
    font: pick(draft.font, draft.customFont),
    colors: draft.colors,
    name: draft.name.trim(),
    category: draft.category,
    description: draft.description.trim(),
    notes: draft.notes.trim(),
  };
}

export function buildBriefText(b: ResolvedBrief): string {
  return [
    "PLATFORM",
    `- Target platform: ${b.platform}`,
    "",
    "TECH STACK",
    `- Frontend: ${b.frontend}`,
    `- Backend: ${b.backend}`,
    `- Database / storage: ${b.database}`,
    "",
    "DESIGN",
    `- Visual style: ${b.style}`,
    `- Theme mode: ${b.themeMode}`,
    b.customThemeNote ? `- Custom theme appearance: ${b.customThemeNote}` : "",
    `- Primary color: ${b.colors.primary}`,
    `- Accent color: ${b.colors.accent}`,
    `- Background color: ${b.colors.background}`,
    `- Font family: ${b.font}`,
    "",
    "PROJECT",
    `- Name: ${b.name}`,
    `- Category: ${b.category}`,
    `- Description: ${b.description}`,
    `- Guiding notes & constraints: ${b.notes || "None supplied."}`,
  ]
    .filter(Boolean)
    .join("\n");
}
