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
  return (settings.provider === "custom" ? settings.customModel : settings.model).trim();
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

export const NON_CHAT_PATTERN = /(embedding|embed|whisper|tts|moderation)/i;

export function presetBase(provider: Settings["provider"]) {
  return OPENAI_COMPATIBLE_BASE[provider] ?? "";
}

/** Trimmed, slash-stripped config used for every request. */
export function normalizeConfig(settings: Settings) {
  const apiKey = settings.apiKey.trim();
  const model = resolveModel(settings).trim();
  const rawBase = settings.baseUrl.trim() || presetBase(settings.provider);
  const baseUrl = rawBase.replace(/\/+$/, "").replace(/\/chat\/completions$/, "");
  return { apiKey, model, baseUrl, maxTokens: Math.max(1, Math.floor(settings.maxTokens || 8000)) };
}

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url || "the provider";
  }
}

async function readError(response: Response, provider: string) {
  const text = await response.text().catch(() => "");
  let detail = text.slice(0, 400);
  try {
    const parsed = JSON.parse(text);
    detail = parsed?.error?.message ?? parsed?.message ?? parsed?.detail ?? detail;
    if (typeof detail !== "string") detail = JSON.stringify(detail);
  } catch {
    /* keep raw text */
  }
  const s = response.status;
  let lead: string;
  if (s === 401 || s === 403) lead = `The API key was rejected by ${provider}.`;
  else if (s === 404) lead = "Endpoint or model not found. Check the base URL and model name.";
  else if (s === 400) lead = `${provider} rejected the request. If the model is not a chat model, pick a chat model.`;
  else if (s === 429) lead = "Rate limit or no credits on this key.";
  else lead = `${provider} returned an error.`;
  return new GenerationError(`${lead} (HTTP ${s})${detail ? ` ${detail}` : ""}`, text || undefined);
}

function networkError(error: unknown, url: string): GenerationError {
  if (error instanceof GenerationError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new GenerationError("The request timed out after 120 seconds.");
  }
  return new GenerationError(
    `Could not reach ${hostOf(url)}. Check the base URL and your connection. If the provider blocks browser requests, use openrouter.`,
  );
}

type OnDelta = (text: string) => void;

async function request(url: string, init: RequestInit, provider: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw await readError(response, provider);
    return response;
  } catch (e) {
    throw networkError(e, url);
  } finally {
    clearTimeout(timer);
  }
}

async function readSse(response: Response, pick: (json: any) => string, onDelta?: OnDelta) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const piece = pick(JSON.parse(payload));
        if (piece) {
          out += piece;
          onDelta?.(out);
        }
      } catch {
        /* partial frame */
      }
    }
  }
  return out;
}

interface CallOpts {
  maxTokens: number;
  stream: boolean;
  onDelta?: OnDelta;
}

async function callOpenAiCompatible(settings: Settings, system: string, user: string, o: CallOpts) {
  const cfg = normalizeConfig(settings);
  if (!cfg.baseUrl) throw new GenerationError("Add a base URL in Settings.");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cfg.apiKey}`,
  };
  if (settings.provider === "openrouter") {
    headers["HTTP-Referer"] = window.location.origin;
    headers["X-Title"] = "Qwilr";
  }
  const url = `${cfg.baseUrl}/chat/completions`;
  const response = await request(
    url,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: o.maxTokens,
        temperature: 0.4,
        stream: o.stream,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    },
    settings.provider,
  );
  if (o.stream) return readSse(response, (j) => j?.choices?.[0]?.delta?.content ?? "", o.onDelta);
  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(settings: Settings, system: string, user: string, o: CallOpts) {
  const cfg = normalizeConfig(settings);
  const response = await request(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: o.maxTokens,
        temperature: 0.4,
        stream: o.stream,
        system,
        messages: [{ role: "user", content: user }],
      }),
    },
    "anthropic",
  );
  if (o.stream)
    return readSse(response, (j) => (j?.type === "content_block_delta" ? (j.delta?.text ?? "") : ""), o.onDelta);
  const data = await response.json();
  return (data?.content ?? []).map((part: { text?: string }) => part.text ?? "").join("");
}

async function callGemini(settings: Settings, system: string, user: string, o: CallOpts) {
  const cfg = normalizeConfig(settings);
  const method = o.stream ? "streamGenerateContent?alt=sse&" : "generateContent?";
  const response = await request(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:${method}key=${encodeURIComponent(cfg.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: o.maxTokens, temperature: 0.4 },
      }),
    },
    "gemini",
  );
  const pick = (j: any) =>
    (j?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
  if (o.stream) return readSse(response, pick, o.onDelta);
  return pick(await response.json());
}

function callProvider(settings: Settings, system: string, user: string, o: CallOpts): Promise<string> {
  if (settings.provider === "anthropic") return callAnthropic(settings, system, user, o);
  if (settings.provider === "gemini") return callGemini(settings, system, user, o);
  return callOpenAiCompatible(settings, system, user, o);
}

export async function testConnection(settings: Settings): Promise<string> {
  if (settings.provider === "local") throw new GenerationError("Local mode does not need a connection test.");
  const cfg = normalizeConfig(settings);
  if (!cfg.apiKey) throw new GenerationError("Add your API key first.");
  if (!cfg.model) throw new GenerationError("Choose or type a model first.");
  if (settings.provider === "custom" && !cfg.baseUrl) {
    throw new GenerationError("Add the base URL for your custom provider.");
  }
  await callProvider(settings, settings.systemPrompt, "Reply with the single word: ready.", {
    maxTokens: 5,
    stream: false,
  });
  return `Connected to ${settings.provider} with model ${cfg.model}.`;
}

export async function generatePrd(draft: Draft, settings: Settings, onDelta?: OnDelta): Promise<PrdRecord> {
  const brief = resolveBrief(draft);
  const briefText = buildBriefText(brief);
  const isLocal = settings.provider === "local";

  let sections: string[];
  if (isLocal) {
    sections = localGenerate(brief);
  } else {
    if (!settings.apiKey.trim()) throw new GenerationError(`Add an API key in Settings to generate with ${settings.provider}.`);
    const raw = await callProvider(settings, settings.systemPrompt, briefText, {
      maxTokens: normalizeConfig(settings).maxTokens,
      stream: true,
      onDelta,
    });
    if (!raw.trim()) throw new GenerationError(`${settings.provider} returned an empty response.`, raw);
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
