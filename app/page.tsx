import { withAuth } from "@workos-inc/authkit-nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createConceptProject } from "@/app/actions/concept-projects";
import { listAccessibleActiveConceptProjects } from "@/lib/concept-project/server";
import { listAccessibleProjects } from "@/lib/project/server";
import { upsertViewerFromWorkOSSession } from "@/lib/zero/context";
import { getWorkOSSession } from "@/lib/workos-session";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { SiteHeader } from "@/components/ui/site-header";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

function getProjectName(name: string | null) {
	return name?.trim() || "Untitled concept project";
}

function getProjectDescription(description: string | null) {
	return description?.trim() || "No description yet.";
}

function getRealProjectName(name: string) {
	return name.trim() || "Untitled project";
}

export default async function Home() {
	const { user } = await withAuth();

	if (!user) {
		redirect("/login");
	}

	const session = await getWorkOSSession();

	if (!session) {
		redirect("/login");
	}

	const viewer = await upsertViewerFromWorkOSSession(session);
	const [activeConceptRows, projectRows] = await Promise.all([
		listAccessibleActiveConceptProjects(viewer.id),
		listAccessibleProjects(viewer.id),
	]);

	const isEmpty = activeConceptRows.length === 0 && projectRows.length === 0;

	return (
		<>
			<SiteHeader />
			<main className="mx-auto flex min-h-[calc(100vh-61px)] w-full max-w-6xl flex-col px-4 py-8 sm:px-6">
				<section className="flex flex-col gap-6">
					<div className="flex items-start justify-between gap-4">
						{!isEmpty ? (
							<form action={createConceptProject}>
								<Button type="submit">New Concept Project</Button>
							</form>
						) : null}
					</div>

					{isEmpty ? (
						<Card className="bg-linear-to-br from-sky-100/30 via-sky-50 to-blue-100/70 shadow-none dark:from-background dark:via-blue-950/30 dark:to-sky-900/20">
							<CardHeader>
								<CardTitle>Start with a Concept Project</CardTitle>
								<CardDescription className="max-w-2xl leading-6 font-sans">
									A <span className="font-semibold">Concept Project</span> is
									the entry point for every new project in FurrowDev. You start
									by chatting with an agent to discover the project, then the
									agent turns that into a name, description, and initial roadmap
									before it graduates into a full project.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-3">
								<div className="flex">
									<form action={createConceptProject}>
										<Button className="cursor-pointer" size="lg" type="submit">
											New Concept Project
										</Button>
									</form>
								</div>
							</CardContent>
						</Card>
					) : activeConceptRows.length > 0 ? (
						<Card className="p-0!">
							<CardContent className="px-0">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Name</TableHead>
											<TableHead>Description</TableHead>
											<TableHead>Status</TableHead>
											<TableHead className="text-right">Action</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{activeConceptRows.map((project) => (
											<TableRow key={project.id}>
												<TableCell className="font-medium">
													{getProjectName(project.name)}
												</TableCell>
												<TableCell className="max-w-xl text-muted-foreground">
													<p className="line-clamp-3">
														{getProjectDescription(project.description)}
													</p>
												</TableCell>
												<TableCell>Concept</TableCell>
												<TableCell className="text-right">
													<Link
														href={`/concept-project/${project.id}?scroll=latest`}
													>
														<Button size="sm" variant="outline">
															Open
														</Button>
													</Link>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					) : null}

					{projectRows.length > 0 ? (
						<Card>
							<CardHeader>
								<CardTitle>Projects</CardTitle>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Name</TableHead>
											<TableHead>Description</TableHead>
											<TableHead>Status</TableHead>
											<TableHead className="text-right">Action</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{projectRows.map((project) => (
											<TableRow key={project.id}>
												<TableCell className="font-medium">
													{getRealProjectName(project.name)}
												</TableCell>
												<TableCell className="max-w-xl text-muted-foreground">
													<p className="line-clamp-2">
														{getProjectDescription(project.description)}
													</p>
												</TableCell>
												<TableCell>Project</TableCell>
												<TableCell className="text-right">
													<Link href={`/project/${project.id}`}>
														<Button size="sm" variant="outline">
															Open
														</Button>
													</Link>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					) : null}
				</section>
			</main>
		</>
	);
}
