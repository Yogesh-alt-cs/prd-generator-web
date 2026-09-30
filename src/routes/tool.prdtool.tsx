import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SettingsProvider } from "@/components/prd/SettingsContext";
import { Shell } from "@/components/prd/Shell";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/tool/prdtool")({
  component: Layout,
});

function Layout() {
  return (
    <SettingsProvider>
      <Shell>
        <Outlet />
      </Shell>
      <Toaster richColors position="bottom-right" />
    </SettingsProvider>
  );
}
