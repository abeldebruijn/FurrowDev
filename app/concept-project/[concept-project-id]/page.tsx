import { and, asc, eq, or } from "drizzle-orm";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { notFound } from "next/navigation";

import {
  conceptProjectChatMessages,
  conceptProjectChats,
  conceptProjects,
  organisations,
  projects,
  roadmapItems,
} from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteHeader } from "@/components/ui/site-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ConceptProjectPageProps = {
  params: Promise<{
    "concept-project-id": string;
  }>;
};

function getName(name: string | null) {
  return name?.trim() || "Untitled concept project";
}

function getDescription(description: string | null) {
  return description?.trim() || "No description yet.";
}

export default async function ConceptProjectPage({ params }: ConceptProjectPageProps) {
  await withAuth({ ensureSignedIn: true });

  const session = await getWorkOSSession();

  if (!session) {
    notFound();
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const { ["concept-project-id"]: conceptProjectId } = await params;
  const db = getDb();

  const [conceptProject] = await db
    .select({
      description: conceptProjects.description,
      id: conceptProjects.id,
      name: conceptProjects.name,
      roadmapId: conceptProjects.roadmapId,
    })
    .from(conceptProjects)
    .leftJoin(organisations, eq(conceptProjects.orgOwner, organisations.id))
    .where(
      and(
        eq(conceptProjects.id, conceptProjectId),
        or(eq(conceptProjects.userOwner, viewer.id), eq(organisations.ownerId, viewer.id)),
      ),
    )
    .limit(1);

  if (!conceptProject) {
    notFound();
  }

  const [chat, graduatedProject] = await Promise.all([
    db
      .select({
        id: conceptProjectChats.id,
      })
      .from(conceptProjectChats)
      .where(eq(conceptProjectChats.conceptProjectId, conceptProject.id))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        id: projects.id,
      })
      .from(projects)
      .where(eq(projects.conceptProjectId, conceptProject.id))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  const [messages, roadmap] = await Promise.all([
    chat
      ? db
          .select({
            id: conceptProjectChatMessages.id,
            message: conceptProjectChatMessages.message,
            order: conceptProjectChatMessages.order,
            type: conceptProjectChatMessages.type,
          })
          .from(conceptProjectChatMessages)
          .where(eq(conceptProjectChatMessages.conceptProjectChatId, chat.id))
          .orderBy(asc(conceptProjectChatMessages.order))
      : [],
    conceptProject.roadmapId
      ? db
          .select({
            description: roadmapItems.description,
            id: roadmapItems.id,
            majorVersion: roadmapItems.majorVersion,
            minorVersion: roadmapItems.minorVersion,
            name: roadmapItems.name,
          })
          .from(roadmapItems)
          .where(eq(roadmapItems.roadmapId, conceptProject.roadmapId))
          .orderBy(
            asc(roadmapItems.majorVersion),
            asc(roadmapItems.minorVersion),
            asc(roadmapItems.name),
          )
      : [],
  ]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-61px)] w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <section className="space-y-2">
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground">
            {getName(conceptProject.name)}
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {getDescription(conceptProject.description)}
          </p>
        </section>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Minimal concept project shell.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Project ID</TableCell>
                  <TableCell>{conceptProject.id}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Stage</TableCell>
                  <TableCell>{graduatedProject ? "Graduated" : "Concept"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Chat</TableCell>
                  <TableCell>{chat ? `${messages.length} messages` : "Not started"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Roadmap</TableCell>
                  <TableCell>
                    {conceptProject.roadmapId ? `${roadmap.length} items` : "Not created"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Chat</CardTitle>
            <CardDescription>Conversation history will live here.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {messages.length > 0 ? (
              messages.map((message) => (
                <div key={message.id} className="rounded-lg border px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {message.type}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{message.message}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No messages yet. The discovery conversation will appear here.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Roadmap</CardTitle>
            <CardDescription>Initial roadmap data will appear here.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {roadmap.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roadmap.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{`${item.majorVersion}.${item.minorVersion}`}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.description?.trim() || "No description yet."}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="px-4">
                <p className="text-sm text-muted-foreground">
                  No roadmap items yet. This page is intentionally only a simple data shell.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
