import { LinkButton } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listProjectIdeas } from "@/lib/idea/server";

import { getProjectPageData } from "../project-page-data";
import { VisionUpdatedAt } from "./vision-updated-at";

type ProjectIdeasPageProps = {
  params: Promise<{
    "project-id": string;
  }>;
};

function getRoadmapLabel(idea: {
  roadmapItemId: string | null;
  roadmapItemMajorVersion: number | null;
  roadmapItemMinorVersion: number | null;
  roadmapItemName: string | null;
}) {
  if (
    !idea.roadmapItemId ||
    !idea.roadmapItemName ||
    idea.roadmapItemMajorVersion === null ||
    idea.roadmapItemMinorVersion === null
  ) {
    return idea.roadmapItemName ?? "None";
  }

  return `v${idea.roadmapItemMajorVersion}.${idea.roadmapItemMinorVersion} - ${idea.roadmapItemName}`;
}

export default async function ProjectIdeasPage({ params }: ProjectIdeasPageProps) {
  const routeParams = await params;
  const { project, viewer } = await getProjectPageData(routeParams["project-id"]);
  const ideas = await listProjectIdeas(viewer.id, project.id);

  return (
    <section className="mb-12 flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mt-1 text-xl font-semibold text-foreground">Ideas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Shared project ideas created from private vision workspaces.
          </p>
        </div>

        <LinkButton href={`/project/${project.id}/visions`}>New vision</LinkButton>
      </div>

      {ideas.length === 0 ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>No ideas yet</CardTitle>
            <CardDescription className="font-sans">
              Convert a private vision into the first project-visible idea.
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
                  <TableHead>Roadmap item</TableHead>
                  <TableHead>Source vision</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ideas.map((idea) => (
                  <TableRow key={idea.id}>
                    <TableCell className="font-medium">{idea.title}</TableCell>
                    <TableCell className="text-muted-foreground">{getRoadmapLabel(idea)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {idea.sourceVisionTitle}
                    </TableCell>
                    <TableCell>{idea.createdByName}</TableCell>
                    <TableCell>
                      <VisionUpdatedAt isoString={idea.createdAt.toISOString()} />
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
