"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ZeroContext } from "@rocicorp/zero/react";
import { useAccessToken } from "@workos-inc/authkit-nextjs/components";

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

type CreateVisionDialogProps = {
  projectId: string;
  roadmapItems: Array<{
    description: string | null;
    id: string;
    majorVersion: number;
    minorVersion: number;
    name: string;
  }>;
};

function getRoadmapOptionLabel(item: CreateVisionDialogProps["roadmapItems"][number]) {
  return `v${item.majorVersion}.${item.minorVersion} - ${item.name}`;
}

export function CreateVisionDialog({ projectId, roadmapItems }: CreateVisionDialogProps) {
  const router = useRouter();
  const zero = useContext(ZeroContext);
  const { accessToken } = useAccessToken();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [roadmapItemId, setRoadmapItemId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createRequestAbortRef = useRef<AbortController | null>(null);

  function resetForm() {
    setError(null);
    setRoadmapItemId("");
    setTitle("");
  }

  useEffect(() => {
    return () => {
      createRequestAbortRef.current?.abort();
    };
  }, []);

  async function handleCreate() {
    if (isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const abortController = new AbortController();
    createRequestAbortRef.current = abortController;

    try {
      const response = await fetch(`/api/project/${projectId}/ideas`, {
        body: JSON.stringify({
          roadmapItemId: roadmapItemId || undefined,
          title: title.trim() || undefined,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
        signal: abortController.signal,
      });

      if (!response.ok) {
        if (response.status === 401 && accessToken && zero) {
          await zero.connection.connect({ auth: accessToken });
        }

        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to create vision.");
      }

      const data = (await response.json()) as { id: string };

      if (abortController.signal.aborted) {
        return;
      }

      resetForm();
      setOpen(false);
      router.push(`/project/${projectId}/ideas/vision/${data.id}`);
      router.refresh();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      setError(error instanceof Error ? error.message : "Failed to create vision.");
    } finally {
      if (createRequestAbortRef.current === abortController) {
        createRequestAbortRef.current = null;
      }

      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (!nextOpen) {
          createRequestAbortRef.current?.abort();
          resetForm();
        }
      }}
      open={open}
    >
      <DialogTrigger render={<Button />}>New vision</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create vision</DialogTitle>
          <DialogDescription>
            Start a private AI conversation for exploring what this project should build next.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="vision-title">
              Title
            </label>
            <input
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              id="vision-title"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Untitled vision"
              value={title}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="vision-roadmap-item">
              Based on roadmap node
            </label>
            <select
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              id="vision-roadmap-item"
              onChange={(event) => setRoadmapItemId(event.target.value)}
              value={roadmapItemId}
            >
              <option value="">None</option>
              {roadmapItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {getRoadmapOptionLabel(item)}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              This only seeds the initial discussion. It does not store a lasting roadmap link.
            </p>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Create failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button disabled={isSubmitting} onClick={handleCreate} type="button">
            {isSubmitting ? "Creating..." : "Create vision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
