import { withAuth } from "@workos-inc/authkit-nextjs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ConceptProjectDiscovery } from "@/components/concept-project/concept-project-discovery";
import { SiteHeader } from "@/components/ui/site-header";
import {
  ensureConceptProjectOpeningMessage,
  getAccessibleConceptProject,
  getConceptProjectRoadmapItems,
  getConceptProjectTranscript,
} from "@/lib/concept-project/server";
import { getDb } from "@/lib/db";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";

type ConceptProjectPageProps = {
  params: Promise<{
    "concept-project-id": string;
  }>;
};

export const metadata: Metadata = {
  title: "Concept Project | FurrowDev",
  description: "Discover a new concept project with staged agent handoffs.",
};

function getName(name: string | null) {
  return name?.trim() || "Untitled concept project";
}

export default async function ConceptProjectPage({ params }: ConceptProjectPageProps) {
  await withAuth({ ensureSignedIn: true });

  const session = await getWorkOSSession();

  if (!session) {
    notFound();
  }

  const viewer = await upsertViewerFromWorkOSSession(session);
  const routeParams = await params;
  const conceptProjectId = routeParams["concept-project-id"];
  const db = getDb();

  const conceptProject = await getAccessibleConceptProject(viewer.id, conceptProjectId, db);

  if (!conceptProject) {
    notFound();
  }

  await ensureConceptProjectOpeningMessage(conceptProject, db);

  const [messages, roadmap] = await Promise.all([
    getConceptProjectTranscript(conceptProject.id, db),
    getConceptProjectRoadmapItems(conceptProject.roadmapId, db),
  ]);

  return (
    <>
      <SiteHeader title={getName(conceptProject.name)} />
      <main className="mx-auto flex min-h-[calc(100vh-61px)] w-full max-w-350 flex-col gap-6 px-4 py-8 sm:px-6">
        <ConceptProjectDiscovery
          conceptProjectId={conceptProject.id}
          initialConceptProject={{
            ...conceptProject,
            understoodForWhomAt: conceptProject.understoodForWhomAt?.toISOString() ?? null,
            understoodHowAt: conceptProject.understoodHowAt?.toISOString() ?? null,
            understoodWhatAt: conceptProject.understoodWhatAt?.toISOString() ?? null,
          }}
          initialMessages={messages}
          initialRoadmap={roadmap}
          zeroEnabled={Boolean(process.env.NEXT_PUBLIC_ZERO_CACHE_URL)}
        />
      </main>
    </>
  );
}
