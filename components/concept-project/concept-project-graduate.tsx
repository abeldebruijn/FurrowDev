"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
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
} from "@/components/ui/dialog";

type ConceptProjectGraduateProps = {
  conceptProjectId: string;
  projectId: string | null;
};

export function ConceptProjectGraduate({
  conceptProjectId,
  projectId,
}: ConceptProjectGraduateProps) {
  const prefersReducedMotion = useReducedMotion();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (projectId) {
    return (
      <Link href={`/project/${projectId}`}>
        <Button>Open Project</Button>
      </Link>
    );
  }

  async function handleGraduate() {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/concept-project/${conceptProjectId}/graduate`, {
        method: "POST",
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        projectId?: string;
      } | null;

      if (!response.ok || !data?.projectId) {
        throw new Error(data?.error || "Failed to graduate concept project.");
      }

      setIsOpen(false);
      router.push(`/project/${data.projectId}`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to graduate concept project.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
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
        className="rounded-xl"
        transition={{
          duration: 2.2,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
          repeatDelay: 0.35,
        }}
      >
        <Button
          className="shadow-[0_0_0_rgba(16,185,129,0)]"
          onClick={() => setIsOpen(true)}
          type="button"
        >
          Graduate to Project
        </Button>
      </motion.div>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Graduate to a real project</DialogTitle>
          <DialogDescription>
            This creates a real project, copies the current roadmap into it, and archives this
            concept project as the discovery record.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTitle>One-way graduation</AlertTitle>
          <AlertDescription>
            After this step, future work should continue in the real project. This concept remains
            available as a read-only archive.
          </AlertDescription>
        </Alert>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Graduation failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button disabled={isSubmitting} onClick={() => setIsOpen(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={isSubmitting} onClick={handleGraduate}>
            {isSubmitting ? "Graduating..." : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
