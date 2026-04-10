"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConceptProjectGraduate } from "@/components/concept-project/concept-project-graduate";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ConceptProjectStage } from "@/lib/concept-project/shared";

type ConceptProjectPostSetupActionsProps = {
  conceptProjectId: string;
  currentStage: ConceptProjectStage;
  disabled?: boolean;
  projectId: string | null;
};

export function ConceptProjectPostSetupActions({
  conceptProjectId,
  currentStage,
  disabled = false,
  projectId,
}: ConceptProjectPostSetupActionsProps) {
  const router = useRouter();
  const [isSwitchingToGrillMe, setIsSwitchingToGrillMe] = useState(false);
  const isGrillMeStage = currentStage === "grill_me";
  const grillMeTooltip = isGrillMeStage
    ? "You are in the grill me stage. Keep pressure-testing assumptions while graduation stays available."
    : "Enter the grill me stage to stress-test the setup plan and uncover missing constraints before graduation.";

  async function handleSwitchToGrillMe() {
    if (disabled || isGrillMeStage || isSwitchingToGrillMe) {
      return;
    }

    setIsSwitchingToGrillMe(true);

    try {
      const response = await fetch(`/api/concept-project/${conceptProjectId}/settings`, {
        body: JSON.stringify({
          appendIntroMessage: true,
          currentStage: "grill_me",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;

        throw new Error(payload?.error || "Failed to enter grill me.");
      }

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to enter grill me.");
    } finally {
      setIsSwitchingToGrillMe(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button
            disabled={disabled || isGrillMeStage || isSwitchingToGrillMe}
            onClick={handleSwitchToGrillMe}
            type="button"
            variant={isGrillMeStage ? "secondary" : "outline"}
          >
            {isSwitchingToGrillMe ? "Switching..." : "Grill Me"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{grillMeTooltip}</TooltipContent>
      </Tooltip>
      <ConceptProjectGraduate conceptProjectId={conceptProjectId} projectId={projectId} />
    </div>
  );
}
