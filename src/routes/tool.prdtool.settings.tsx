import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eyebrow, Surface } from "@/components/prd/Shell";
import { useSettings } from "@/components/prd/SettingsContext";
import { DEFAULT_SETTINGS, DEFAULT_SYSTEM_PROMPT, OPENAI_COMPATIBLE_BASE, PROVIDER_MODELS, PROVIDERS } from "@/lib/prd/constants";
import { NON_CHAT_PATTERN, testConnection } from "@/lib/prd/generation";
import { clearAllLocalData } from "@/lib/prd/storage";
import { cn } from "@/lib/utils";
import type { ProviderId, Shape, ThemeMode } from "@/lib/prd/types";

export const Route = createFileRoute("/tool/prdtool/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Qwilr" },
      { name: "description", content: "Choose your AI provider, model, system prompt and appearance for Qwilr." },
      { property: "og:title", content: "Settings — Qwilr" },
      { property: "og:description", content: "Configure providers and appearance. Stored only in your browser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function Seg<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium capitalize",
            value === o ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function SettingsPage() {
  const { settings, update, replace } = useSettings();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const models = PROVIDER_MODELS[settings.provider];
  const remote = settings.provider !== "local";
  const openAi = remote && settings.provider !== "anthropic" && settings.provider !== "gemini";
  const preset = OPENAI_COMPATIBLE_BASE[settings.provider] ?? "";
  const baseUrl = settings.baseUrl || preset;
  const modelValue = settings.provider === "custom" ? settings.customModel : settings.model;
  const { warning: urlWarning, suggested } = checkBaseUrl(baseUrl, preset, modelValue);

  const test = async () => {
    setTesting(true);
    try {
      const msg = await testConnection(settings);
      setResult({ ok: true, text: msg });
      toast.success(msg);
    } catch (e) {
      const text = e instanceof Error ? e.message : "Connection failed";
      setResult({ ok: false, text });
      toast.error(text);
    } finally {
      setTesting(false);
    }
  };

  const clearAll = async () => {
    if (!window.confirm("Delete all PRDs, drafts and settings from this browser?")) return;
    await clearAllLocalData();
    replace(DEFAULT_SETTINGS);
    toast.success("All local data cleared");
  };

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Settings</Eyebrow>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Settings</h1>
        <p className="mt-2 text-muted-foreground">Saved automatically, only in this browser.</p>
      </div>

      <Surface className="space-y-5">
        <h2 className="text-xl font-semibold">Generation provider</h2>
        <Seg
          options={PROVIDERS.map((p) => p.id)}
          value={settings.provider}
          onChange={(p: ProviderId) =>
            update({ provider: p, model: PROVIDER_MODELS[p][0] ?? "", baseUrl: OPENAI_COMPATIBLE_BASE[p] ?? "" })
          }
        />
        {remote && (
          <>
            {openAi && (
              <div className="space-y-2">
                <Label htmlFor="base-url">Base URL</Label>
                <Input
                  id="base-url"
                  value={baseUrl}
                  onChange={(e) => update({ baseUrl: e.target.value })}
                  placeholder="https://api.example.com/v1"
                />
                {urlWarning && (
                  <p className="text-xs text-destructive">
                    {urlWarning}{" "}
                    {suggested && (
                      <button type="button" className="font-semibold underline" onClick={() => update({ baseUrl: suggested })}>
                        Use suggested URL
                      </button>
                    )}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                list="model-options"
                value={modelValue}
                onChange={(e) =>
                  update(settings.provider === "custom" ? { customModel: e.target.value } : { model: e.target.value })
                }
                placeholder="Model name"
              />
              <datalist id="model-options">
                {models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              {NON_CHAT_PATTERN.test(modelValue) && (
                <p className="text-xs text-destructive">This looks like a non-chat model and cannot generate a PRD.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>API key</Label>
              <Input
                type="password"
                autoComplete="off"
                value={settings.apiKey}
                onChange={(e) => update({ apiKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Stored in this browser and sent only to {settings.provider}.</p>
            </div>
            <Button variant="secondary" onClick={test} disabled={testing}>
              {testing && <Loader2 className="size-4 animate-spin" />} Test connection
            </Button>
            {result && (
              <div
                role="status"
                className={cn(
                  "flex items-start justify-between gap-3 rounded-xl border p-3 text-sm",
                  result.ok ? "border-primary bg-primary-soft text-foreground" : "border-destructive text-destructive",
                )}
              >
                <span>{result.text}</span>
                <button type="button" aria-label="Dismiss result" onClick={() => setResult(null)}>
                  <X className="size-4" />
                </button>
              </div>
            )}
            <details className="rounded-xl border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium">Advanced</summary>
              <div className="mt-3 space-y-2">
                <Label htmlFor="max-tokens">Max tokens</Label>
                <Input
                  id="max-tokens"
                  type="number"
                  min={256}
                  max={64000}
                  value={settings.maxTokens}
                  onChange={(e) => update({ maxTokens: Number(e.target.value) || 8000 })}
                  className="max-w-40"
                />
              </div>
            </details>
          </>
        )}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>System prompt</Label>
            <Button size="sm" variant="ghost" onClick={() => update({ systemPrompt: DEFAULT_SYSTEM_PROMPT })}>
              Reset
            </Button>
          </div>
          <Textarea rows={8} value={settings.systemPrompt} onChange={(e) => update({ systemPrompt: e.target.value })} />
        </div>
      </Surface>

      <Surface className="space-y-5">
        <h2 className="text-xl font-semibold">Appearance</h2>
        <div className="space-y-2">
          <Label>Mode</Label>
          <Seg<ThemeMode> options={["light", "dark", "system"]} value={settings.mode} onChange={(m) => update({ mode: m })} />
        </div>
        <div className="space-y-2">
          <Label>Corners</Label>
          <Seg<Shape> options={["rounded", "sharp"]} value={settings.shape} onChange={(s) => update({ shape: s })} />
        </div>
        <div className="space-y-2">
          <Label>Accent color</Label>
          <input
            type="color"
            aria-label="Accent color"
            value={settings.seed}
            onChange={(e) => update({ seed: e.target.value })}
            className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-transparent"
          />
        </div>
      </Surface>

      <Surface className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Clear all local data</h2>
          <p className="text-sm text-muted-foreground">Removes every PRD, draft and setting from this browser.</p>
        </div>
        <Button variant="destructive" onClick={clearAll}>
          Clear all local data
        </Button>
      </Surface>
    </div>
  );
}

function checkBaseUrl(url: string, preset: string, model: string): { warning: string; suggested: string } {
  const u = url.trim().replace(/\/+$/, "");
  if (!u) return { warning: "", suggested: "" };
  const fallback = preset || u.replace(/\/(chat\/completions|models\/.*)$/, "");
  if (!/^https?:\/\//.test(u)) return { warning: "The base URL must start with https://.", suggested: preset };
  if (/\/chat\/completions$/.test(u))
    return { warning: "Leave out /chat/completions; it is added automatically.", suggested: u.replace(/\/chat\/completions$/, "") };
  const last = u.split("/").pop() ?? "";
  if ((model && u.includes(model.trim())) || /\/models(\/|$)/.test(u) || /[-.:]\d|instruct|gpt|llama|claude/i.test(last))
    return { warning: "This URL seems to contain a model name. It should be the API root.", suggested: fallback };
  if (preset && !/\/v1$/.test(u)) return { warning: "This does not look like an API root (missing /v1).", suggested: preset };
  return { warning: "", suggested: "" };
}
