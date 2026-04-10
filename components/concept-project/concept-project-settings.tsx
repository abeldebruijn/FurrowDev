"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ConceptProjectSettingsProps = {
  conceptProjectId: string;
  description: string | null;
  isArchived?: boolean;
  name: string | null;
  projectId?: string | null;
};

type SettingsInnerProps = ConceptProjectSettingsProps & {
  onSaveName: (name: string) => Promise<void>;
};

function getDisplayName(name: string | null | undefined) {
  return name?.trim() || "Untitled concept project";
}

function SettingsDialogContent({
  conceptProjectId,
  description,
  isArchived = false,
  name,
  onSaveName,
  projectId,
}: SettingsInnerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draftName, setDraftName] = useState(getDisplayName(name));
  const [currentName, setCurrentName] = useState(getDisplayName(name));
  const [nameIdeas, setNameIdeas] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const nextName = getDisplayName(name);

    setCurrentName(nextName);
    setDraftName(nextName);
  }, [name]);

  useEffect(() => {
    if (!open) {
      setDraftName(currentName);
      setNameIdeas([]);
      setError(null);
      setIsDeleteConfirmOpen(false);
    }
  }, [currentName, open]);

  async function handleSave() {
    if (isArchived) {
      return;
    }

    const trimmedName = draftName.trim();

    if (!trimmedName) {
      setError("Name cannot be empty.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await onSaveName(trimmedName);
      setCurrentName(trimmedName);
      setOpen(false);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save the name.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleGenerateIdeas() {
    if (isArchived) {
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/concept-project/${conceptProjectId}/settings/name-ideas`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate names");
      }

      const data = (await response.json()) as { names?: string[] };
      setNameIdeas(data.names ?? []);
    } catch {
      setError("Failed to generate name ideas.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/concept-project/${conceptProjectId}/settings`, {
        body: JSON.stringify({
          deleteConceptProject: true,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete concept project");
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Failed to delete the concept project.");
      setIsDeleting(false);
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button className="ml-1" size="icon" variant="ghost" />}>
        <Settings />
      </DialogTrigger>
      <DialogContent className="max-w-3xl!">
        <DialogHeader>
          <DialogTitle>Concept Project Settings</DialogTitle>
          <DialogDescription>
            {isArchived
              ? "This concept project is archived. Metadata is locked, but deletion is still available."
              : "Adjust the concept-project metadata."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-foreground" htmlFor="concept-project-name">
                Name
              </label>
              <Button
                disabled={isArchived || isGenerating || isSaving || isDeleting}
                onClick={handleGenerateIdeas}
                type="button"
                variant="outline"
              >
                <Sparkles />
                {isGenerating ? "Generating..." : "Generate 10 ideas"}
              </Button>
            </div>
            <input
              disabled={isArchived}
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              id="concept-project-name"
              onChange={(event) => setDraftName(event.target.value)}
              value={draftName}
            />
          </div>

          {nameIdeas.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Generated name ideas</p>
              <div className="flex flex-wrap gap-2">
                {nameIdeas.map((idea) => (
                  <Button
                    key={idea}
                    onClick={() => setDraftName(idea)}
                    type="button"
                    variant="outline"
                  >
                    {idea}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Generated description</p>
            <div className="rounded-xl border bg-muted/40 px-3 py-3 text-sm leading-6 text-muted-foreground">
              {description?.trim() || "No description yet."}
            </div>
          </div>

          {isArchived && projectId ? (
            <Alert>
              <AlertTitle>Project created</AlertTitle>
              <AlertDescription>
                This concept is preserved as a read-only archive. Continue work in the real project.
              </AlertDescription>
              <div className="mt-4">
                <Link href={`/project/${projectId}`}>
                  <Button type="button">Open Project</Button>
                </Link>
              </div>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Action failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {isDeleteConfirmOpen ? (
            <Alert variant="destructive">
              <AlertTitle>Delete concept project</AlertTitle>
              <AlertDescription>
                {isArchived
                  ? "This will permanently delete the archived concept project, its transcript, and its concept roadmap. The real project stays intact but loses its source concept link."
                  : "This will permanently delete the concept project, its transcript, and generated roadmap. This cannot be reverted."}
              </AlertDescription>
              <div className="mt-4 flex gap-2">
                <Button
                  disabled={isDeleting}
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={isDeleting}
                  onClick={handleDelete}
                  type="button"
                  variant="destructive"
                >
                  <Trash2 />
                  {isDeleting ? "Deleting..." : "Delete concept project"}
                </Button>
              </div>
            </Alert>
          ) : (
            <div className="border-t pt-4">
              <Button
                onClick={() => setIsDeleteConfirmOpen(true)}
                type="button"
                variant="destructive"
              >
                <Trash2 />
                Delete concept project
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={isArchived || isSaving || isDeleting}
            onClick={handleSave}
            type="button"
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConceptProjectSettings(props: ConceptProjectSettingsProps) {
  return (
    <SettingsDialogContent
      {...props}
      onSaveName={async (name) => {
        const response = await fetch(`/api/concept-project/${props.conceptProjectId}/settings`, {
          body: JSON.stringify({ name }),
          headers: {
            "content-type": "application/json",
          },
          method: "PATCH",
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || "Failed to save the name.");
        }
      }}
    />
  );
}
