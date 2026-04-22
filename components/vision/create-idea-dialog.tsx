"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type CreateIdeaDialogProps = {
  projectId: string;
  roadmapItems: Array<{
    description: string | null;
    id: string;
    majorVersion: number;
    minorVersion: number;
    name: string;
  }>;
  title: string;
  visionId: string;
};

function getRoadmapOptionLabel(item: CreateIdeaDialogProps["roadmapItems"][number]) {
  return `v${item.majorVersion}.${item.minorVersion} - ${item.name}`;
}

export function CreateIdeaDialog({
  projectId,
  roadmapItems,
  title,
  visionId,
}: CreateIdeaDialogProps) {
  const prefersReducedMotion = useReducedMotion();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState(title);
  const [roadmapItemId, setRoadmapItemId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetForm() {
    setError(null);
    setIdeaTitle(title);
    setRoadmapItemId("");
  }

  async function handleCreateIdea() {
    if (isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/project/${projectId}/visions/${visionId}/convert`, {
        body: JSON.stringify({
          roadmapItemId: roadmapItemId || undefined,
          title: ideaTitle.trim() || undefined,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to create idea.");
      }

      resetForm();
      setOpen(false);
      router.push(`/project/${projectId}/ideas`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create idea.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (nextOpen) {
          setIdeaTitle(title);
        } else {
          resetForm();
        }
      }}
      open={open}
    >
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <motion.div
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    boxShadow: [
                      "0 0 10px rgba(16, 185, 129, 0.1)",
                      "0 0 20px rgba(16, 185, 129, 0.38)",
                      "0 0 10px rgba(16, 185, 129, 0.1)",
                    ],
                    scale: [1, 1.02, 1],
                  }
            }
            className="rounded-md"
            transition={{
              duration: 2.2,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: 0.35,
            }}
          >
            <DialogTrigger render={<Button type="button" variant="outline" />}>
              Create idea
            </DialogTrigger>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          Create a project-visible idea from this vision and archive the private workspace.
        </TooltipContent>
      </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create idea</DialogTitle>
          <DialogDescription>
            Turn this private vision into a project-visible idea and archive the source vision.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="idea-title">
              Title
            </label>
            <input
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              id="idea-title"
              onChange={(event) => setIdeaTitle(event.target.value)}
              value={ideaTitle}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="idea-roadmap-item">
              Linked roadmap node
            </label>
            <select
              className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              id="idea-roadmap-item"
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
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Create failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button disabled={isSubmitting} onClick={handleCreateIdea} type="button">
            {isSubmitting ? "Creating..." : "Create idea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
