import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Eyebrow, Surface } from "@/components/prd/Shell";
import { deletePrd, listPrds } from "@/lib/prd/storage";
import type { PrdRecord } from "@/lib/prd/types";

export const Route = createFileRoute("/tool/prdtool/")({
  head: () => ({
    meta: [
      { title: "Qwilr — Your PRD packages" },
      { name: "description", content: "Local-first PRD generator. Browse and manage your saved PRD packages." },
      { property: "og:title", content: "Qwilr — Your PRD packages" },
      { property: "og:description", content: "Turn a guided 6-step brief into a developer-ready PRD package." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [prds, setPrds] = useState<PrdRecord[] | null>(null);
  useEffect(() => {
    listPrds().then(setPrds).catch(() => setPrds([]));
  }, []);

  const remove = async (id: string) => {
    await deletePrd(id);
    setPrds((p) => p?.filter((r) => r.id !== id) ?? null);
    toast.success("PRD deleted");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Dashboard</Eyebrow>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Your PRD packages</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Everything lives in this browser. Nothing is uploaded unless you generate with a remote provider.
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/tool/prdtool/builder">
            <Plus className="size-4" /> New PRD
          </Link>
        </Button>
      </div>

      {prds === null ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : prds.length === 0 ? (
        <Surface className="text-center">
          <FileText className="mx-auto size-10 text-primary" />
          <h2 className="mt-4 text-xl font-semibold">No PRDs yet</h2>
          <p className="mt-1 text-muted-foreground">Answer six quick steps to create your first package.</p>
          <Button asChild className="mt-6">
            <Link to="/tool/prdtool/builder">Start the builder</Link>
          </Button>
        </Surface>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {prds.map((r) => (
            <Surface key={r.id} className="flex flex-col gap-3 p-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{r.project.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {r.project.category} · {r.platform}
                  </p>
                </div>
                <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => remove(r.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{r.project.description}</p>
              <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
                <span>
                  {new Date(r.generatedAt).toLocaleString()} · {r.generator.model}
                </span>
                <Button asChild size="sm" variant="secondary">
                  <Link to="/tool/prdtool/viewer" search={{ id: r.id }}>
                    Open
                  </Link>
                </Button>
              </div>
            </Surface>
          ))}
        </div>
      )}
    </div>
  );
}
