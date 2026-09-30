import { buildBriefText, resolveBrief } from "./brief";
import { FILE_MARKERS, FILE_NAMES, OPENAI_COMPATIBLE_BASE } from "./constants";
import { localGenerate } from "./localTemplate";
import type { Draft, PrdFile, PrdRecord, Settings } from "./types";

export class GenerationError extends Error {
  raw?: string | undefined;
  constructor(message: string, raw?: string) {
    super(message);
    this.raw = raw;
  }
}

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export function resolveModel(settings: Settings) {
  return settings.provider === "custom" ? settings.customModel.trim() : settings.model;
}

export function parseSections(raw: string): string[] {
  const missing = FILE_MARKERS.filter((m) => !raw.includes(m));
  if (missing.length) {
    throw new GenerationError(
      `The model response is missing ${missing.length} required file marker(s): ${missing.join(", ")}`,
      raw,
    );
  }
  const sections: string[] = [];
  for (let i = 0; i < FILE_MARKERS.length; i++) {
    const start = raw.indexOf(FILE_MARKERS[i]!) + FILE_MARKERS[i]!.length;
    const end = i + 1 < FILE_MARKERS.length ? raw.indexOf(FILE_MARKERS[i + 1]!) : raw.length;
    const body = raw.slice(start, end).trim();
    if (!body) throw new GenerationError(`Section ${FILE_NAMES[i]} came back empty.`, raw);
    sections.push(body);
  }
  return sections;
}

function friendlyError(error: unknown): GenerationError {
  if (error instanceof GenerationError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (/Failed to fetch|NetworkError|load failed/i.test(message)) {
    return new GenerationError(
      "The browser could not reach the provider. This is usually a CORS restriction or no network connection. Providers that block browser requests need a server, or use the local template instead.",
    );
  }
  return new GenerationError(message);
}

async function readError(response: Response) {
  const text = await response.text().catch(() => "");
  let detail = text.slice(0, 400);
  try {
    const parsed = JSON.parse(text);
    detail = parsed?.error?.message ?? parsed?.message ?? detail;
  } catch {
    /* keep raw text */
  }
  if (response.status === 401 || response.status === 403) {
    return new GenerationError(`The provider rejected the API key (${response.status}). ${detail}`);
  }
  if (response.status === 429) {
    return new GenerationError(`The provider is rate limiting this key (429). ${detail}`);
  }
  return new GenerationError(`Provider returned ${response.status}. ${detail}`);
}

async function callOpenAiCompatible(
  settings: Settings,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const base =
    settings.provider === "custom"
      ? settings.baseUrl.trim().replace(/\/$/, "")
      : OPENAI_COMPATIBLE_BASE[settings.provider];
  if (!base) throw new GenerationError("No base URL is configured for this provider.");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: resolveModel(settings),
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!response.ok) throw await readError(response);
  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(settings: Settings, system: string, user: string, maxTokens: number): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: resolveModel(settings),
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!response.ok) throw await readError(response);
  const data = await response.json();
  return (data?.content ?? []).map((part: { text?: string }) => part.text ?? "").join("");
}

async function callGemini(settings: Settings, system: string, user: string, maxTokens: number): Promise<string> {
  const model = resolveModel(settings);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(settings.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    },
  );
  if (!response.ok) throw await readError(response);
  const data = await response.json();
  return (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
}

async function callProvider(settings: Settings, system: string, user: string, maxTokens = 8000): Promise<string> {
  if (settings.provider === "anthropic") return callAnthropic(settings, system, user, maxTokens);
  if (settings.provider === "gemini") return callGemini(settings, system, user, maxTokens);
  return callOpenAiCompatible(settings, system, user, maxTokens);
}

export async function testConnection(settings: Settings): Promise<string> {
  if (settings.provider === "local") throw new GenerationError("Local mode does not need a connection test.");
  if (!settings.apiKey.trim()) throw new GenerationError("Add your API key first.");
  if (!resolveModel(settings)) throw new GenerationError("Choose or type a model first.");
  if (settings.provider === "custom" && !settings.baseUrl.trim()) {
    throw new GenerationError("Add the base URL for your custom provider.");
  }
  try {
    const text = await callProvider(settings, "Reply with the single word: ready.", "ping", 16);
    return text.trim() || "Connected.";
  } catch (error) {
    throw friendlyError(error);
  }
}

export async function generatePrd(draft: Draft, settings: Settings): Promise<PrdRecord> {
  const brief = resolveBrief(draft);
  const briefText = buildBriefText(brief);
  const isLocal = settings.provider === "local";

  let sections: string[];
  if (isLocal) {
    sections = localGenerate(brief);
  } else {
    if (!settings.apiKey.trim()) throw new GenerationError("Add your API key in Settings before generating remotely.");
    let raw: string;
    try {
      raw = await callProvider(settings, settings.systemPrompt, briefText);
    } catch (error) {
      throw friendlyError(error);
    }
    sections = parseSections(raw);
  }

  const files: PrdFile[] = sections.map((content, i) => ({
    name: FILE_NAMES[i]!,
    filename: `${FILE_NAMES[i]}.md`,
    wordCount: wordCount(content),
    content,
  }));

  return {
    schemaVersion: "1.0",
    id: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    generator: {
      app: "Qwilr",
      provider: settings.provider,
      model: isLocal ? "Local template" : resolveModel(settings),
      mode: isLocal ? "local" : "remote",
    },
    project: {
      name: brief.name,
      category: brief.category,
      description: brief.description,
      notes: brief.notes,
    },
    platform: brief.platform,
    stack: { frontend: brief.frontend, backend: brief.backend, database: brief.database },
    design: {
      style: brief.style,
      themeMode: brief.themeMode,
      customThemeNote: brief.customThemeNote,
      colors: brief.colors,
      font: brief.font,
    },
    files,
  };
}
