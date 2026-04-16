"use client";

import { useEffect, useState } from "react";
import { Archive, Settings, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

type VisionSettingsDialogProps = {
  canManage: boolean;
  onTitleChange: (title: string) => void;
  projectId: string;
  title: string;
  visionId: string;
};

export function VisionSettingsDialog({
  canManage,
  onTitleChange,
  projectId,
  title,
  visionId,
}: VisionSettingsDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [currentTitle, setCurrentTitle] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setCurrentTitle(title);
    setDraftTitle(title);
  }, [title]);

  useEffect(() => {
    if (!open) {
      setDraftTitle(currentTitle);
      setError(null);
      setIsArchiveConfirmOpen(false);
      setIsDeleteConfirmOpen(false);
      setIsArchiving(false);
      setIsDeleting(false);
      setIsSaving(false);
    }
  }, [currentTitle, open]);

  if (!canManage) {
    return null;
  }

  async function handleSave() {
    const trimmedTitle = draftTitle.trim();

    if (!trimmedTitle) {
      setError("Vision name cannot be empty.");
      return;
    }

    if (trimmedTitle === currentTitle) {
      setOpen(false);
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/project/${projectId}/ideas/${visionId}/settings`, {
        body: JSON.stringify({
          title: trimmedTitle,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to save the vision.");
      }

      setCurrentTitle(trimmedTitle);
      onTitleChange(trimmedTitle);
      setOpen(false);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save the vision.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive() {
    setError(null);
    setIsArchiving(true);

    try {
      const response = await fetch(`/api/project/${projectId}/ideas/${visionId}/settings`, {
        body: JSON.stringify({
          archive: true,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to archive the vision.");
      }

      router.push(`/project/${projectId}/ideas`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to archive the vision.");
      setIsArchiving(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/project/${projectId}/ideas/${visionId}/settings`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to delete the vision.");
      }

      router.push(`/project/${projectId}/ideas`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to delete the vision.");
      setIsDeleting(false);
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <Button aria-label="Open vision settings" size="icon" type="button" variant="outline" />
        }
      >
        <Settings />
      </DialogTrigger>
      <DialogContent className="max-w-2xl!">
        <DialogHeader>
          <DialogTitle>Vision settings</DialogTitle>
          <DialogDescription>Adjust the vision name or close it out.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="vision-name">
              Vision name
            </label>
            <input
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              disabled={isSaving || isArchiving || isDeleting}
              id="vision-name"
              onChange={(event) => setDraftTitle(event.target.value)}
              value={draftTitle}
            />
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Action failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {isArchiveConfirmOpen ? (
            <Alert>
              <AlertTitle>Archive vision</AlertTitle>
              <AlertDescription>
                This removes the vision from the active ideas list and closes the live workspace.
              </AlertDescription>
              <div className="mt-4 flex gap-2">
                <Button
                  disabled={isArchiving || isDeleting || isSaving}
                  onClick={() => setIsArchiveConfirmOpen(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={isArchiving || isDeleting || isSaving}
                  onClick={handleArchive}
                  type="button"
                  variant="outline"
                >
                  <Archive />
                  {isArchiving ? "Archiving..." : "Archive vision"}
                </Button>
              </div>
            </Alert>
          ) : (
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium text-foreground">Archive vision</p>
              <p className="text-sm text-muted-foreground">
                Hide this vision from active work without permanently deleting its record.
              </p>
              <Button
                disabled={isArchiving || isDeleting || isSaving}
                onClick={() => setIsArchiveConfirmOpen(true)}
                type="button"
                variant="outline"
              >
                <Archive />
                Archive vision
              </Button>
            </div>
          )}

          {isDeleteConfirmOpen ? (
            <Alert variant="destructive">
              <AlertTitle>Delete vision</AlertTitle>
              <AlertDescription>
                This permanently deletes the vision, its transcript, collaborator access, and its
                summary document. This cannot be reverted.
              </AlertDescription>
              <div className="mt-4 flex gap-2">
                <Button
                  disabled={isDeleting || isArchiving || isSaving}
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={isDeleting || isArchiving || isSaving}
                  onClick={handleDelete}
                  type="button"
                  variant="destructive"
                >
                  <Trash2 />
                  {isDeleting ? "Deleting..." : "Delete vision"}
                </Button>
              </div>
            </Alert>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Delete vision</p>
              <p className="text-sm text-muted-foreground">
                Permanently remove this vision and all of its private conversation state.
              </p>
              <Button
                disabled={isDeleting || isArchiving || isSaving}
                onClick={() => setIsDeleteConfirmOpen(true)}
                type="button"
                variant="destructive"
              >
                <Trash2 />
                Delete vision
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={isSaving || isArchiving || isDeleting}
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
