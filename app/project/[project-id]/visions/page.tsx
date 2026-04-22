import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateVisionDialog } from "@/components/vision/create-vision-dialog";
import { hasArchivedProjectVisions, listVisibleProjectVisions } from "@/lib/vision/server";

import { getProjectPageData } from "../project-page-data";
import { VisionUpdatedAt } from "../ideas/vision-updated-at";

type ProjectVisionsPageProps = {
  params: Promise<{
    "project-id": string;
  }>;
  searchParams: Promise<{
    archived?: string;
  }>;
};

export default async function ProjectVisionsPage({
  params,
  searchParams,
}: ProjectVisionsPageProps) {
  const routeParams = await params;
  const { archived } = await searchParams;
  const { project, projectRoadmapItems, viewer } = await getProjectPageData(
    routeParams["project-id"],
  );
  const showArchived = archived === "1" || archived === "true";
  const [visions, hasArchivedVisions] = await Promise.all([
    listVisibleProjectVisions(viewer.id, routeParams["project-id"], undefined, {
      includeArchived: showArchived,
    }),
    hasArchivedProjectVisions(viewer.id, routeParams["project-id"]),
  ]);
  const shouldShowArchivedToggle = showArchived
    ? visions.length > 0
    : visions.length > 0 || hasArchivedVisions;
  const archivedToggleHref = showArchived
    ? `/project/${project.id}/visions`
    : `/project/${project.id}/visions?archived=1`;

  return (
    <section className="mb-12 flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mt-1 text-xl font-semibold text-foreground">Visions</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Start a private conversation, before turning it into a shared idea later.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {shouldShowArchivedToggle ? (
            showArchived || hasArchivedVisions ? (
              <LinkButton href={archivedToggleHref} variant="outline">
                {showArchived ? "Hide archived" : "Show archived"}
              </LinkButton>
            ) : (
              <Button disabled type="button" variant="outline">
                Show archived
              </Button>
            )
          ) : null}
          <CreateVisionDialog projectId={project.id} roadmapItems={projectRoadmapItems} />
        </div>
      </div>

      {visions.length === 0 ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{showArchived ? "No visions found" : "No visions yet"}</CardTitle>
            <CardDescription className="font-sans">
              {showArchived
                ? "There are no active or archived visions visible to you in this project yet."
                : "Create the first private vision for this project from a rough thought or an existing roadmap node."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="p-0!">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Collaborators</TableHead>
                  <TableHead>Last updated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visions.map((vision) => (
                  <TableRow key={vision.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <span>{vision.title}</span>
                        {vision.archivedAt ? (
                          <span className="text-xs font-normal text-muted-foreground">
                            Archived
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{vision.ownerName}</TableCell>
                    <TableCell className="max-w-sm text-muted-foreground">
                      {vision.collaborators.length > 0
                        ? vision.collaborators.map((collaborator) => collaborator.name).join(", ")
                        : "Private to owner"}
                    </TableCell>
                    <TableCell>
                      <VisionUpdatedAt isoString={vision.updatedAt.toISOString()} />
                    </TableCell>
                    <TableCell className="text-right">
                      <LinkButton
                        href={`/project/${project.id}/visions/vision/${vision.id}`}
                        size="sm"
                        variant="outline"
                      >
                        Open
                      </LinkButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
