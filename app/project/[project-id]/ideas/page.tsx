import Link from "next/link";

import { CreateVisionDialog } from "@/components/vision/create-vision-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listVisibleProjectVisions } from "@/lib/vision/server";

import { VisionUpdatedAt } from "./vision-updated-at";
import { getProjectPageData } from "../project-page-data";

type ProjectIdeasPageProps = {
  params: Promise<{
    "project-id": string;
  }>;
};

export default async function ProjectIdeasPage({ params }: ProjectIdeasPageProps) {
  const routeParams = await params;
  const { project, projectRoadmapItems, viewer } = await getProjectPageData(
    routeParams["project-id"],
  );
  const visions = await listVisibleProjectVisions(viewer.id, routeParams["project-id"]);

  return (
    <section className="flex flex-col gap-4 mb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mt-1 text-xl font-semibold text-foreground">Visions</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Start a private conversation, before turning it into a shared idea later.
          </p>
        </div>

        <CreateVisionDialog projectId={project.id} roadmapItems={projectRoadmapItems} />
      </div>

      {visions.length === 0 ? (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>No visions yet</CardTitle>
            <CardDescription className="font-sans">
              Create the first private vision for this project from a rough thought or an existing
              roadmap node.
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
                    <TableCell className="font-medium">{vision.title}</TableCell>
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
                      <Link
                        className={buttonVariants({ size: "sm", variant: "outline" })}
                        href={`/project/${project.id}/ideas/vision/${vision.id}`}
                      >
                        Open
                      </Link>
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
