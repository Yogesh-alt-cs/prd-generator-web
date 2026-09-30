import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Download, FileJson, FileText, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Eyebrow, Surface } from "@/components/prd/Shell";
import { getPrd, listPrds } from "@/lib/prd/storage";
import { downloadMarkdownFile, downloadMarkdownZip, downloadMetaJson, downloadPdf } from "@/lib/prd/exportService";
import { FILE_TABS } from "@/lib/prd/constants";
import { cn } from "@/lib/utils";
import type { PrdRecord } from "@/lib/prd/types";

export const Route = createFileRoute("/tool/prdtool/viewer")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Viewer — VibePRD" },
      { name: "description", content: "Read, copy and export your PRD package as Markdown, PDF or Meta JSON." },
      { property: "og:title", content: "Viewer — VibePRD" },
      { property: "og:description", content: "Read and export your generated PRD package." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Viewer,
});

function Viewer() {
  const { id } = Route.useSearch();
  const [record, setRecord] = useState<PrdRecord | null | undefined>(undefined);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    (id ? getPrd(id) : listPrds().then((l) => l[0])).then((r) => setRecord(r ?? null));
  }, [id]);

  if (record === undefined) return <p className="text-muted-foreground">Loading…</p>;
  if (record === null)
    return (
      <Surface className="text-center">
        <h1 className="text-xl font-semibold">No PRD to show</h1>
        <p className="mt-1 text-muted-foreground">Generate one in the builder first.</p>
        <Button asChild className="mt-6">
          <Link to="/tool/prdtool/builder">Open builder</Link>
        </Button>
      </Surface>
    );

  const file = record.files[tab]!;
  const run = async (fn: () => unknown, msg: string) => {
    try {
      await fn();
      toast.success(msg);
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Viewer</Eyebrow>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">{record.project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(record.generatedAt).toLocaleString()} · {record.generator.provider} / {record.generator.model}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => run(() => downloadPdf(record), "PDF downloaded")}>
            <FileText className="size-4" /> PDF
          </Button>
          <Button variant="secondary" onClick={() => run(() => downloadMarkdownZip(record), "ZIP downloaded")}>
            <Package className="size-4" /> Markdown ZIP
          </Button>
          <Button variant="secondary" onClick={() => run(() => downloadMetaJson(record), "Meta JSON downloaded")}>
            <FileJson className="size-4" /> Meta JSON
          </Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {FILE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium",
              tab === t.id ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Surface>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
          <p className="text-sm text-muted-foreground">
            {file.filename} · {file.wordCount} words
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => run(() => navigator.clipboard.writeText(file.content), "Copied to clipboard")}
            >
              <Copy className="size-4" /> Copy
            </Button>
            <Button size="sm" variant="ghost" onClick={() => run(() => downloadMarkdownFile(record, tab), "File downloaded")}>
              <Download className="size-4" /> .md
            </Button>
          </div>
        </div>
        <article className="prd-prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{file.content}</ReactMarkdown>
        </article>
      </Surface>
    </div>
  );
}
