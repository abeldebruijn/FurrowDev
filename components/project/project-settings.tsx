"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";

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

type ProjectSettingsProps = {
  description: string | null;
  name: string;
  projectId: string;
};

export function ProjectSettings({ description, name, projectId }: ProjectSettingsProps) {
  const router = useRouter();
  const [draftDescription, setDraftDescription] = useState(description ?? "");
  const [draftName, setDraftName] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDraftDescription(description ?? "");
      setDraftName(name);
      setError(null);
    }
  }, [description, isOpen, name]);

  async function handleSave() {
    if (!draftName.trim()) {
      setError("Name cannot be empty.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/project/${projectId}/settings`, {
        body: JSON.stringify({
          description: draftDescription,
          name: draftName,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to save project.");
      }

      setIsOpen(false);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save project.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger render={<Button className="ml-1" size="icon" variant="ghost" />}>
        <Settings />
      </DialogTrigger>
      <DialogContent className="max-w-3xl!">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
          <DialogDescription>Adjust the real project metadata.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="project-name">
              Name
            </label>
            <input
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              id="project-name"
              onChange={(event) => setDraftName(event.target.value)}
              value={draftName}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="project-description">
              Description
            </label>
            <textarea
              className="min-h-32 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              id="project-description"
              onChange={(event) => setDraftDescription(event.target.value)}
              value={draftDescription}
            />
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Save failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button disabled={isSaving} onClick={handleSave}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
