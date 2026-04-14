import Link from "next/link";

import type { ProjectAccess } from "@/lib/project/server";
import { AddWidgetPanel } from "./add-widget-panel";
import { cn } from "@/lib/utils";

export function WidgetLayout({
  layout,
  projectId,
  widgetEdit,
}: {
  layout: ProjectAccess["layout"];
  projectId: string;
  widgetEdit: boolean;
}) {
  if (!layout) {
    return <OnBoardWidgetLayout projectId={projectId} widgetEdit={widgetEdit} />;
  }

  return (
    <section className="rounded-2xl border border-border bg-muted/20 p-4">
      <p className="text-sm text-muted-foreground">widget layout v{layout.version}</p>
    </section>
  );
}

export function OnBoardWidgetLayout({
  projectId,
  widgetEdit,
}: {
  projectId: string;
  widgetEdit: boolean;
}) {
  const editHref = `/project/${projectId}?widgetEdit=true`;

  return (
    <>
      <section className="flex w-full items-end justify-between rounded-2xl border border-dashed border-border bg-muted/20 p-4">
        <div>
          <h2 className="text-lg text-foreground">Widgets</h2>
          <p className="text-sm text-muted-foreground">You do not have any widgets.</p>
        </div>

        <Link
          aria-disabled={widgetEdit}
          className={cn(widgetEdit ? "pointer-events-none opacity-50" : undefined)}
          href={editHref}
        >
          Add Widgets
        </Link>
      </section>

      {widgetEdit ? <AddWidgetPanel projectId={projectId} /> : null}
    </>
  );
}
