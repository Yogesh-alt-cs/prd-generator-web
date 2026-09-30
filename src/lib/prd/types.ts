export type ProviderId =
  | "local"
  | "openrouter"
  | "groq"
  | "together"
  | "mistral"
  | "nvidia"
  | "anthropic"
  | "gemini"
  | "custom";

export type ThemeMode = "light" | "dark" | "system";
export type Shape = "rounded" | "sharp";

export interface Draft {
  platform: string;
  customPlatform: string;
  frontend: string;
  customFrontend: string;
  backend: string;
  customBackend: string;
  database: string;
  customDatabase: string;
  style: string;
  customStyle: string;
  themeMode: string;
  customThemeNote: string;
  colors: { primary: string; accent: string; background: string };
  font: string;
  customFont: string;
  name: string;
  category: string;
  description: string;
  notes: string;
}

export interface Settings {
  provider: ProviderId;
  model: string;
  customModel: string;
  baseUrl: string;
  apiKey: string;
  systemPrompt: string;
  seed: string;
  mode: ThemeMode;
  shape: Shape;
  maxTokens: number;
}

export interface PrdFile {
  name: string;
  filename: string;
  wordCount: number;
  content: string;
}

export interface PrdRecord {
  schemaVersion: "1.0";
  id: string;
  generatedAt: string;
  generator: { app: "Qwilr"; provider: string; model: string; mode: "local" | "remote" };
  project: { name: string; category: string; description: string; notes: string };
  platform: string;
  stack: { frontend: string; backend: string; database: string };
  design: {
    style: string;
    themeMode: string;
    customThemeNote: string;
    colors: { primary: string; accent: string; background: string };
    font: string;
  };
  files: PrdFile[];
}
