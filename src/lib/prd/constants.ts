import type { Draft, ProviderId, Settings } from "./types";

export const DEFAULT_SYSTEM_PROMPT = `You are a senior software product architect and technical writer. You create professional, developer-ready Product Requirement Documents (PRDs) that are good enough to hand directly to an AI coding assistant.

You will receive a structured project brief with PLATFORM, TECH STACK, DESIGN, and PROJECT details. Generate a complete PRD package split into exactly FOUR sections. Separate each section with these exact markers on their own lines:

===FILE:01_Product_Overview===
===FILE:02_Features_Requirements===
===FILE:03_UI_UX_Requirements===
===FILE:04_Technical_Requirements===

01_Product_Overview must cover the problem, solution, audience, value proposition, and 3-5 measurable goals. 02_Features_Requirements must provide prioritized functional requirements organized by module or screen. 03_UI_UX_Requirements must begin with a Markdown table titled "### Brand Color Palette & Styling Tokens" that lists Primary, Secondary, Accent, Background, Surface, Text, Gradient if applicable, and chosen font family; then define exact design guidance, screens, breakpoints, and accessibility. 04_Technical_Requirements must use exactly the chosen stack, recommend real maintained libraries relevant to it, and provide architecture, data flow or endpoints, and a data schema appropriate to the selected storage.

Never use emojis. Never invent or substitute technologies, colors, or fonts the user did not choose. Use clean professional Markdown with headers, tables, and lists. Keep the depth proportional to the stated scope. Every requirement must trace back to the supplied brief. Return only the four marked sections with no preamble or closing remarks.`;

export const FILE_MARKERS = [
  "===FILE:01_Product_Overview===",
  "===FILE:02_Features_Requirements===",
  "===FILE:03_UI_UX_Requirements===",
  "===FILE:04_Technical_Requirements===",
];

export const FILE_NAMES = [
  "01_Product_Overview",
  "02_Features_Requirements",
  "03_UI_UX_Requirements",
  "04_Technical_Requirements",
];

export const FILE_TABS = [
  { id: 0, label: "01 Product Overview" },
  { id: 1, label: "02 Features & Requirements" },
  { id: 2, label: "03 UI/UX Requirements" },
  { id: 3, label: "04 Technical Requirements" },
];

export const PLATFORMS = [
  { value: "Website / web app", desc: "Browser-first product, responsive down to mobile." },
  { value: "Mobile application", desc: "iOS and Android app experience first." },
  { value: "Desktop application", desc: "Installed desktop product with local power." },
  { value: "Custom platform", desc: "Describe the exact target yourself." },
];

export const FRONTENDS = ["React", "Next.js", "Vue", "Flutter", "React Native", "Electron", "Custom"];
export const BACKENDS = ["Serverless API", "Node.js", "Python", "Firebase", "None", "Custom"];
export const DATABASES = ["Firebase", "PostgreSQL", "MongoDB", "SQLite", "Local only", "Custom"];

export const STYLES = [
  "Minimal",
  "Modern gradient",
  "Glassmorphism",
  "Corporate",
  "Playful",
  "Dark-tech",
  "Material design",
  "Flat",
  "Custom",
];

export const THEME_MODES = ["Light", "Dark", "System dual-theme", "Custom"];

export const FONTS = ["Outfit", "Poppins", "Inter", "Roboto", "SF Pro Display", "Custom"];

export const CATEGORIES = [
  "SaaS",
  "Marketplace",
  "E-commerce",
  "Social / Community",
  "Productivity",
  "Fintech",
  "Education",
  "Healthcare",
  "Developer tool",
  "Content / Media",
  "Internal tool",
  "Other",
];

export const STEP_LABELS = ["Platform", "Stack", "Style", "Theme", "Type", "Brief"];

export const PROVIDERS: { id: ProviderId; label: string }[] = [
  { id: "local", label: "local" },
  { id: "openrouter", label: "openrouter" },
  { id: "groq", label: "groq" },
  { id: "together", label: "together" },
  { id: "mistral", label: "mistral" },
  { id: "nvidia", label: "nvidia" },
  { id: "anthropic", label: "anthropic" },
  { id: "gemini", label: "gemini" },
  { id: "custom", label: "custom" },
];

export const PROVIDER_MODELS: Record<ProviderId, string[]> = {
  local: ["Local template"],
  openrouter: [
    "openai/gpt-4o-mini",
    "anthropic/claude-3.5-sonnet",
    "meta-llama/llama-3.3-70b-instruct",
    "google/gemini-2.0-flash-001",
  ],
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
  together: [
    "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    "Qwen/Qwen2.5-72B-Instruct-Turbo",
    "mistralai/Mixtral-8x7B-Instruct-v0.1",
  ],
  mistral: ["mistral-large-latest", "mistral-small-latest", "open-mistral-nemo"],
  nvidia: ["meta/llama-3.3-70b-instruct", "mistralai/mixtral-8x22b-instruct-v0.1"],
  anthropic: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
  gemini: ["gemini-2.0-flash", "gemini-1.5-pro"],
  custom: [],
};

export const OPENAI_COMPATIBLE_BASE: Partial<Record<ProviderId, string>> = {
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
  together: "https://api.together.xyz/v1",
  mistral: "https://api.mistral.ai/v1",
  nvidia: "https://integrate.api.nvidia.com/v1",
};

export const DEFAULT_DRAFT: Draft = {
  platform: "Website / web app",
  customPlatform: "",
  frontend: "React",
  customFrontend: "",
  backend: "Serverless API",
  customBackend: "",
  database: "Firebase",
  customDatabase: "",
  style: "Material design",
  customStyle: "",
  themeMode: "System dual-theme",
  customThemeNote: "",
  colors: { primary: "#4f46e5", accent: "#06b6d4", background: "#f8fafc" },
  font: "Outfit",
  customFont: "",
  name: "",
  category: "SaaS",
  description: "",
  notes: "",
};

export const DEFAULT_SETTINGS: Settings = {
  provider: "local",
  model: "Local template",
  customModel: "",
  baseUrl: "",
  apiKey: "",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  seed: "#4f46e5",
  mode: "system",
  shape: "rounded",
  toolsUrl: "https://youbtech.com",
};
