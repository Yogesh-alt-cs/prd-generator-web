import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Eyebrow, Surface } from "@/components/prd/Shell";
import { useSettings } from "@/components/prd/SettingsContext";
import { cn } from "@/lib/utils";
import {
  BACKENDS,
  CATEGORIES,
  DATABASES,
  DEFAULT_DRAFT,
  FONTS,
  FRONTENDS,
  PLATFORMS,
  STEP_LABELS,
  STYLES,
  THEME_MODES,
} from "@/lib/prd/constants";
import { clearDraft, loadDraft, putPrd, saveDraft } from "@/lib/prd/storage";
import { generatePrd } from "@/lib/prd/generation";
import type { Draft } from "@/lib/prd/types";

export const Route = createFileRoute("/tool/prdtool/builder")({
  head: () => ({
    meta: [
      { title: "Builder — VibePRD" },
      { name: "description", content: "Answer six guided steps to generate a developer-ready PRD package." },
      { property: "og:title", content: "Builder — VibePRD" },
      { property: "og:description", content: "Guided 6-step brief for a complete PRD package." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Builder,
});

function Chips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            value === o
              ? "border-primary bg-primary-soft text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function Builder() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDraft(loadDraft());
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) saveDraft(draft);
  }, [draft, ready]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const validate = (s: number) => {
    const e: Record<string, string> = {};
    const need = (cond: boolean, key: string, msg: string) => {
      if (cond) e[key] = msg;
    };
    if (s === 0) need(draft.platform === "Custom platform" && !draft.customPlatform.trim(), "customPlatform", "Describe your platform");
    if (s === 1) {
      need(draft.frontend === "Custom" && !draft.customFrontend.trim(), "customFrontend", "Name your frontend");
      need(draft.backend === "Custom" && !draft.customBackend.trim(), "customBackend", "Name your backend");
      need(draft.database === "Custom" && !draft.customDatabase.trim(), "customDatabase", "Name your database");
    }
    if (s === 2) need(draft.style === "Custom" && !draft.customStyle.trim(), "customStyle", "Describe your style");
    if (s === 3) need(draft.font === "Custom" && !draft.customFont.trim(), "customFont", "Name your font");
    if (s === 4) need(!draft.name.trim(), "name", "Project name is required");
    if (s === 5) need(draft.description.trim().length < 20, "description", "Write at least 20 characters");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => validate(step) && setStep((s) => Math.min(5, s + 1));

  const generate = async () => {
    for (let s = 0; s < 6; s++) {
      if (!validate(s)) {
        setStep(s);
        toast.error("Please fix the highlighted fields");
        return;
      }
    }
    setBusy(true);
    try {
      const record = await generatePrd(draft, settings);
      await putPrd(record);
      clearDraft();
      toast.success("PRD package generated");
      navigate({ to: "/tool/prdtool/viewer", search: { id: record.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Builder</Eyebrow>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Describe your product</h1>
        <p className="mt-2 text-muted-foreground">
          Generating with <span className="font-medium text-foreground">{settings.provider}</span>. Your answers save
          automatically.
        </p>
      </div>

      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STEP_LABELS.map((l, i) => (
          <li key={l}>
            <button
              type="button"
              onClick={() => (i < step || validate(step)) && setStep(i)}
              className={cn(
                "w-full rounded-xl border px-3 py-2 text-left text-xs font-semibold",
                i === step
                  ? "border-primary bg-primary-soft text-primary"
                  : i < step
                    ? "border-border text-foreground"
                    : "border-border text-muted-foreground",
              )}
            >
              <span className="block opacity-60">Step {i + 1}</span>
              {l}
            </button>
          </li>
        ))}
      </ol>

      <Surface className="space-y-6">
        {step === 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set("platform", p.value)}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-colors",
                    draft.platform === p.value ? "border-primary bg-primary-soft" : "border-border hover:bg-muted",
                  )}
                >
                  <p className="font-semibold">{p.value}</p>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                </button>
              ))}
            </div>
            {draft.platform === "Custom platform" && (
              <Field label="Custom platform" error={errors.customPlatform}>
                <Input value={draft.customPlatform} onChange={(e) => set("customPlatform", e.target.value)} maxLength={120} />
              </Field>
            )}
          </>
        )}

        {step === 1 && (
          <>
            {(
              [
                ["Frontend", "frontend", "customFrontend", FRONTENDS],
                ["Backend", "backend", "customBackend", BACKENDS],
                ["Database / storage", "database", "customDatabase", DATABASES],
              ] as const
            ).map(([label, key, customKey, opts]) => (
              <Field key={key} label={label} error={errors[customKey]}>
                <Chips options={opts} value={draft[key]} onChange={(v) => set(key, v)} />
                {draft[key] === "Custom" && (
                  <Input
                    placeholder={`Custom ${label.toLowerCase()}`}
                    value={draft[customKey]}
                    onChange={(e) => set(customKey, e.target.value)}
                    maxLength={120}
                  />
                )}
              </Field>
            ))}
          </>
        )}

        {step === 2 && (
          <Field label="Visual style" error={errors.customStyle}>
            <Chips options={STYLES} value={draft.style} onChange={(v) => set("style", v)} />
            {draft.style === "Custom" && (
              <Input value={draft.customStyle} onChange={(e) => set("customStyle", e.target.value)} maxLength={160} />
            )}
          </Field>
        )}

        {step === 3 && (
          <>
            <Field label="Theme mode">
              <Chips options={THEME_MODES} value={draft.themeMode} onChange={(v) => set("themeMode", v)} />
              {draft.themeMode === "Custom" && (
                <Input
                  placeholder="Describe your theme"
                  value={draft.customThemeNote}
                  onChange={(e) => set("customThemeNote", e.target.value)}
                  maxLength={200}
                />
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              {(["primary", "accent", "background"] as const).map((c) => (
                <Field key={c} label={c[0]!.toUpperCase() + c.slice(1)}>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label={`${c} color`}
                      value={draft.colors[c]}
                      onChange={(e) => set("colors", { ...draft.colors, [c]: e.target.value })}
                      className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-transparent"
                    />
                    <Input
                      value={draft.colors[c]}
                      onChange={(e) => set("colors", { ...draft.colors, [c]: e.target.value })}
                      maxLength={9}
                    />
                  </div>
                </Field>
              ))}
            </div>
            <Field label="Font" error={errors.customFont}>
              <Chips options={FONTS} value={draft.font} onChange={(v) => set("font", v)} />
              {draft.font === "Custom" && (
                <Input value={draft.customFont} onChange={(e) => set("customFont", e.target.value)} maxLength={80} />
              )}
            </Field>
          </>
        )}

        {step === 4 && (
          <>
            <Field label="Project name" error={errors.name}>
              <Input value={draft.name} onChange={(e) => set("name", e.target.value)} maxLength={80} placeholder="e.g. TaskFlow" />
            </Field>
            <Field label="Category">
              <Chips options={CATEGORIES} value={draft.category} onChange={(v) => set("category", v)} />
            </Field>
          </>
        )}

        {step === 5 && (
          <>
            <Field label="What does it do, and for whom?" error={errors.description}>
              <Textarea
                rows={6}
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
                maxLength={4000}
                placeholder="Describe the problem, users and the core features."
              />
            </Field>
            <Field label="Extra notes (optional)">
              <Textarea rows={3} value={draft.notes} onChange={(e) => set("notes", e.target.value)} maxLength={2000} />
            </Field>
          </>
        )}

        <div className="flex items-center justify-between border-t border-border pt-6">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
          {step < 5 ? (
            <Button onClick={next}>Continue</Button>
          ) : (
            <Button onClick={generate} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {busy ? "Generating…" : "Generate PRD"}
            </Button>
          )}
        </div>
      </Surface>
    </div>
  );
}
