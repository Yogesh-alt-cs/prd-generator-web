import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eyebrow, Surface } from "@/components/prd/Shell";
import { useSettings } from "@/components/prd/SettingsContext";
import { DEFAULT_SETTINGS, DEFAULT_SYSTEM_PROMPT, PROVIDER_MODELS, PROVIDERS } from "@/lib/prd/constants";
import { testConnection } from "@/lib/prd/generation";
import { clearAllLocalData } from "@/lib/prd/storage";
import { cn } from "@/lib/utils";
import type { ProviderId, Shape, ThemeMode } from "@/lib/prd/types";

export const Route = createFileRoute("/tool/prdtool/settings")({
  head: () => ({
    meta: [
      { title: "Settings — VibePRD" },
      { name: "description", content: "Choose your AI provider, model, system prompt and appearance for VibePRD." },
      { property: "og:title", content: "Settings — VibePRD" },
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
  const models = PROVIDER_MODELS[settings.provider];
  const remote = settings.provider !== "local";

  const test = async () => {
    setTesting(true);
    try {
      const msg = await testConnection(settings);
      toast.success(msg || "Connection works");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connection failed");
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
            update({ provider: p, model: PROVIDER_MODELS[p][0] ?? "", baseUrl: p === "custom" ? settings.baseUrl : "" })
          }
        />
        {remote && (
          <>
            {models.length > 0 && (
              <div className="space-y-2">
                <Label>Model</Label>
                <Seg options={models} value={settings.model} onChange={(m) => update({ model: m })} />
              </div>
            )}
            {settings.provider === "custom" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Base URL (OpenAI-compatible)</Label>
                  <Input
                    value={settings.baseUrl}
                    onChange={(e) => update({ baseUrl: e.target.value })}
                    placeholder="https://api.example.com/v1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Model name</Label>
                  <Input value={settings.customModel} onChange={(e) => update({ customModel: e.target.value })} />
                </div>
              </div>
            )}
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
        <div className="space-y-2">
          <Label>Tools link</Label>
          <Input value={settings.toolsUrl} onChange={(e) => update({ toolsUrl: e.target.value })} />
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
