import { groupConceptProjectRoadmapVersions } from "../../../../lib/concept-project/roadmap";

import { getProjectPageData } from "../project-page-data";

type ProjectRoadmapPageProps = {
  params: Promise<{
    "project-id": string;
  }>;
};

export default async function ProjectRoadmapPage({ params }: ProjectRoadmapPageProps) {
  const routeParams = await params;
  const { projectRoadmap, projectRoadmapItems } = await getProjectPageData(
    routeParams["project-id"],
  );
  const groupedVersions = groupConceptProjectRoadmapVersions(
    projectRoadmapItems,
    projectRoadmap
      ? {
          currentMajor: projectRoadmap.currentMajor,
          currentMinor: projectRoadmap.currentMinor,
        }
      : null,
  );

  if (groupedVersions.length === 0) {
    return <p className="text-sm text-muted-foreground">No roadmap yet for this project.</p>;
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground/80">
            Roadmap
          </p>
          <h1 className="mt-1 text-xl font-semibold text-foreground">Project roadmap</h1>
        </div>
        {projectRoadmap ? (
          <p className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium text-foreground">
            Current v{projectRoadmap.currentMajor}.{projectRoadmap.currentMinor}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 mb-12">
        {groupedVersions.map((version) => (
          <article
            className="rounded-2xl border border-border/70 bg-background p-4"
            id={version.isCurrent ? "current-version" : undefined}
            key={version.version}
          >
            <div className="flex items-center gap-2">
              <p className="font-mono text-xs font-semibold text-muted-foreground">
                {version.version}
              </p>
              {version.isCurrent ? (
                <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">
                  current
                </span>
              ) : null}
              {version.itemCount > 1 ? (
                <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {version.itemCount} items
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {version.items.map((item) => (
                <div className="py-2" key={item.id}>
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  {item.description ? (
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
