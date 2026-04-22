"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Save, Shield, Trash2, UserPlus, Users } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type UserOption = {
  id: string;
  name: string;
};

type OrganisationOption = {
  description: string | null;
  id: string;
  name: string;
};

type SettingsProject = {
  canViewSettings: boolean;
  description: string | null;
  id: string;
  isAdmin: boolean;
  isMaintainer: boolean;
  isOrganisationProject: boolean;
  isOwner: boolean;
  name: string;
  orgOwner: string | null;
  ubiquitousLanguageMarkdown: string | null;
  userOwner: string | null;
};

type ProjectSettingsPageProps = {
  maintainers: UserOption[];
  ownedOrganisations: OrganisationOption[];
  project: SettingsProject;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getRoleSummary(project: SettingsProject) {
  if (project.isOwner) {
    return "Owner";
  }

  if (project.isAdmin) {
    return "Admin";
  }

  if (project.isMaintainer) {
    return "Maintainer";
  }

  return "Viewer";
}

export function ProjectSettingsPage({
  maintainers,
  ownedOrganisations,
  project,
}: ProjectSettingsPageProps) {
  const router = useRouter();
  const [description, setDescription] = useState(project.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [isSavingMaintainer, setIsSavingMaintainer] = useState(false);
  const [isSavingOwnership, setIsSavingOwnership] = useState(false);
  const [maintainerCandidates, setMaintainerCandidates] = useState<UserOption[]>([]);
  const [maintainerQuery, setMaintainerQuery] = useState("");
  const [name, setName] = useState(project.name);
  const [isSearchingMaintainers, setIsSearchingMaintainers] = useState(false);
  const [selectedMaintainerId, setSelectedMaintainerId] = useState("");
  const [selectedOrgOwnerId, setSelectedOrgOwnerId] = useState(project.orgOwner ?? "");
  const [ubiquitousLanguageMarkdown, setUbiquitousLanguageMarkdown] = useState(
    project.ubiquitousLanguageMarkdown ?? "",
  );

  async function saveSettings(body: Record<string, string>) {
    const response = await fetch(`/api/project/${project.id}/settings`, {
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
      },
      method: "PATCH",
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error || "Failed to save project.");
    }
  }

  async function handleSaveProfile() {
    if (!name.trim()) {
      setError("Name cannot be empty.");
      return;
    }

    setError(null);
    setIsSavingProfile(true);

    try {
      await saveSettings({
        description,
        name,
      });
      router.refresh();
    } catch (error) {
      setError(getErrorMessage(error, "Failed to save project profile."));
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSaveLanguage() {
    setError(null);
    setIsSavingLanguage(true);

    try {
      await saveSettings({
        ubiquitousLanguageMarkdown,
      });
      router.refresh();
    } catch (error) {
      setError(getErrorMessage(error, "Failed to save ubiquitous language."));
    } finally {
      setIsSavingLanguage(false);
    }
  }

  async function handleAddMaintainer() {
    if (!selectedMaintainerId) {
      setError("Choose a user to add.");
      return;
    }

    setError(null);
    setIsSavingMaintainer(true);

    try {
      const response = await fetch(`/api/project/${project.id}/maintainers`, {
        body: JSON.stringify({ userId: selectedMaintainerId }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to add maintainer.");
      }

      setSelectedMaintainerId("");
      setMaintainerQuery("");
      setMaintainerCandidates([]);
      router.refresh();
    } catch (error) {
      setError(getErrorMessage(error, "Failed to add maintainer."));
    } finally {
      setIsSavingMaintainer(false);
    }
  }

  async function handleSearchMaintainers() {
    const query = maintainerQuery.trim();

    if (query.length < 2) {
      setError("Search with at least 2 characters.");
      return;
    }

    setError(null);
    setIsSearchingMaintainers(true);

    try {
      const response = await fetch(
        `/api/project/${project.id}/maintainers?q=${encodeURIComponent(query)}`,
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to search users.");
      }

      const data = (await response.json()) as { candidates?: UserOption[] };
      setMaintainerCandidates(data.candidates ?? []);
      setSelectedMaintainerId("");
    } catch (error) {
      setError(getErrorMessage(error, "Failed to search users."));
    } finally {
      setIsSearchingMaintainers(false);
    }
  }

  async function handleRemoveMaintainer(userId: string) {
    setError(null);
    setIsSavingMaintainer(true);

    try {
      const response = await fetch(`/api/project/${project.id}/maintainers`, {
        body: JSON.stringify({ userId }),
        headers: {
          "content-type": "application/json",
        },
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to remove maintainer.");
      }

      router.refresh();
    } catch (error) {
      setError(getErrorMessage(error, "Failed to remove maintainer."));
    } finally {
      setIsSavingMaintainer(false);
    }
  }

  async function handleMoveOwnership() {
    setError(null);
    setIsSavingOwnership(true);

    try {
      const response = await fetch(`/api/project/${project.id}/ownership`, {
        body: JSON.stringify({
          orgOwnerId: selectedOrgOwnerId || null,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to move project ownership.");
      }

      router.refresh();
    } catch (error) {
      setError(getErrorMessage(error, "Failed to move project ownership."));
    } finally {
      setIsSavingOwnership(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-medium">Project settings</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Manage project profile, maintainers, ownership, and language.
        </p>
      </section>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Settings update failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Project profile</CardTitle>
          <CardDescription>Name and description shown across the project.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            Name
            <Input maxLength={120} onChange={(event) => setName(event.target.value)} value={name} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
            Description
            <textarea
              className="min-h-32 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              maxLength={600}
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>
        </CardContent>
        <CardFooter className="justify-end">
          <Button disabled={isSavingProfile} onClick={handleSaveProfile} type="button">
            <Save data-icon="inline-start" />
            {isSavingProfile ? "Saving..." : "Save profile"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access</CardTitle>
          <CardDescription>Project-level maintainers can edit this project.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">Your role</p>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <Shield data-icon="inline-start" />
              <span>{getRoleSummary(project)}</span>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">Current maintainers</p>
            {maintainers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No maintainers added yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {maintainers.map((maintainer) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                    key={maintainer.id}
                  >
                    <span>{maintainer.name}</span>
                    {project.isOwner ? (
                      <Button
                        disabled={isSavingMaintainer}
                        onClick={() => void handleRemoveMaintainer(maintainer.id)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {project.isOwner ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-foreground">Add maintainer</p>
              <Input
                onChange={(event) => {
                  setMaintainerQuery(event.target.value);
                  setMaintainerCandidates([]);
                  setSelectedMaintainerId("");
                }}
                placeholder="Search by name"
                value={maintainerQuery}
              />
              <select
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                onChange={(event) => setSelectedMaintainerId(event.target.value)}
                value={selectedMaintainerId}
              >
                <option value="">Choose a user</option>
                {maintainerCandidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Search returns explicit matches for existing FurrowDev users.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Only the project owner can add or remove maintainers.
            </p>
          )}
        </CardContent>
        {project.isOwner ? (
          <CardFooter className="justify-end">
            <Button
              disabled={isSearchingMaintainers || isSavingMaintainer}
              onClick={handleSearchMaintainers}
              type="button"
              variant="outline"
            >
              {isSearchingMaintainers ? "Searching..." : "Search users"}
            </Button>
            <Button disabled={isSavingMaintainer} onClick={handleAddMaintainer} type="button">
              <UserPlus data-icon="inline-start" />
              {isSavingMaintainer ? "Saving..." : "Add maintainer"}
            </Button>
          </CardFooter>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ownership</CardTitle>
          <CardDescription>
            Move this project between personal and organisation ownership.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            {project.isOrganisationProject ? (
              <Building2 data-icon="inline-start" />
            ) : (
              <Users data-icon="inline-start" />
            )}
            <span>
              {project.isOrganisationProject ? "Organisation project" : "Personal project"}
            </span>
          </div>

          {project.isOwner ? (
            <>
              <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                Owner
                <select
                  className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  onChange={(event) => setSelectedOrgOwnerId(event.target.value)}
                  value={selectedOrgOwnerId}
                >
                  <option value="">Personal project</option>
                  {ownedOrganisations.map((organisation) => (
                    <option key={organisation.id} value={organisation.id}>
                      {organisation.name}
                    </option>
                  ))}
                </select>
              </label>
              {ownedOrganisations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You do not own any organisations this project can move to.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Only the project owner can move ownership.
            </p>
          )}
        </CardContent>
        {project.isOwner ? (
          <CardFooter className="justify-end">
            <Button disabled={isSavingOwnership} onClick={handleMoveOwnership} type="button">
              <Building2 data-icon="inline-start" />
              {isSavingOwnership ? "Moving..." : "Move ownership"}
            </Button>
          </CardFooter>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ubiquitous language</CardTitle>
          <CardDescription>
            Canonical domain language for project conversations and summaries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            className="min-h-80 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            maxLength={30000}
            onChange={(event) => setUbiquitousLanguageMarkdown(event.target.value)}
            value={ubiquitousLanguageMarkdown}
          />
        </CardContent>
        <CardFooter className="justify-end">
          <Button disabled={isSavingLanguage} onClick={handleSaveLanguage} type="button">
            <Save data-icon="inline-start" />
            {isSavingLanguage ? "Saving..." : "Save language"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>Archive and delete controls will live here later.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <Trash2 data-icon="inline-start" />
            <span>Archive and delete are not available yet.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
