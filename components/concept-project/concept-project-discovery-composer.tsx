"use client";

import {
  ArrowDownIcon,
  CheckIcon,
  ChevronDownIcon,
  CommandIcon,
  CornerDownLeftIcon,
} from "lucide-react";

import { ConceptProjectGraduate } from "@/components/concept-project/concept-project-graduate";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CONCEPT_PROJECT_STAGE_LABELS,
  conceptProjectStages,
  type ConceptProjectStage,
} from "@/lib/concept-project/shared";

import {
  type ConceptProjectSnapshot,
  isStageComplete,
} from "@/components/concept-project/concept-project-discovery-shared";

type ConceptProjectDiscoveryComposerProps = {
  canSwitchStages: boolean;
  composerError: string | null;
  composerFormRef: React.RefObject<HTMLFormElement | null>;
  composerShellRef: React.RefObject<HTMLDivElement | null>;
  conceptProject: ConceptProjectSnapshot;
  conceptProjectId: string;
  currentStage: ConceptProjectStage;
  errorMessage?: string;
  handleComposerKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleStageSelect: (stage: ConceptProjectStage) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  hasAnsweredOpeningPrompt: boolean;
  input: string;
  isAtBottom: boolean;
  isSubmitting: boolean;
  isSwitchingStage: boolean;
  maxUnlockedStageIndex: number;
  onInputChange: (value: string) => void;
  onScrollToBottom: () => void;
  openingWordCount: number;
  projectId?: string | null;
  showGraduateAction: boolean;
};

export function ConceptProjectDiscoveryComposer({
  canSwitchStages,
  composerError,
  composerFormRef,
  composerShellRef,
  conceptProject,
  conceptProjectId,
  currentStage,
  errorMessage,
  handleComposerKeyDown,
  handleStageSelect,
  handleSubmit,
  hasAnsweredOpeningPrompt,
  input,
  isAtBottom,
  isSubmitting,
  isSwitchingStage,
  maxUnlockedStageIndex,
  onInputChange,
  onScrollToBottom,
  openingWordCount,
  projectId,
  showGraduateAction,
}: ConceptProjectDiscoveryComposerProps) {
  const stageOptions = conceptProjectStages.map((stage, index) => {
    const isActive = stage === currentStage;
    const isCompleted = isStageComplete(conceptProject, stage);
    const isUnlocked = index <= maxUnlockedStageIndex;

    return {
      isActive,
      isCompleted,
      isUnlocked,
      label: CONCEPT_PROJECT_STAGE_LABELS[stage],
      stage,
    };
  });
  const currentStageOption = stageOptions.find((stage) => stage.stage === currentStage);
  const isStageSelectionDisabled = !canSwitchStages || isSubmitting || isSwitchingStage;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20" ref={composerShellRef}>
      <div className="mx-auto w-full max-w-240 px-4 pb-6 sm:px-6">
        <div className="mb-3 flex h-14 justify-center">
          {!isAtBottom ? (
            <Button
              aria-label="Scroll to latest message"
              className="size-11 rounded-full shadow-md"
              onClick={onScrollToBottom}
              size="icon"
              type="button"
            >
              <ArrowDownIcon className="size-5" />
            </Button>
          ) : null}
        </div>
        <div className="rounded-2xl border bg-background/95 px-6 py-5 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/95">
          <form className="space-y-3" onSubmit={handleSubmit} ref={composerFormRef}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        className="w-full justify-between"
                        disabled={isStageSelectionDisabled}
                        size="sm"
                        type="button"
                        variant="outline"
                      />
                    }
                  >
                    {currentStageOption?.label ?? CONCEPT_PROJECT_STAGE_LABELS[currentStage]}
                    <ChevronDownIcon data-icon="inline-end" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="min-w-60" side="top">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-md text-white">
                        Jump to stage
                      </DropdownMenuLabel>
                      {stageOptions.map((stageOption) => (
                        <DropdownMenuItem
                          disabled={isStageSelectionDisabled || !stageOption.isUnlocked}
                          key={stageOption.stage}
                          onClick={() => handleStageSelect(stageOption.stage)}
                        >
                          <span className="font-sans">{stageOption.label}</span>
                          <DropdownMenuShortcut>
                            {stageOption.isActive
                              ? "Current"
                              : !stageOption.isUnlocked
                                ? "Locked"
                                : stageOption.isCompleted
                                  ? "Done"
                                  : ""}
                          </DropdownMenuShortcut>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="hidden flex-wrap gap-2 sm:flex">
                {stageOptions.map((stageOption) => (
                  <button
                    aria-current={stageOption.isActive ? "step" : undefined}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      stageOption.isActive
                        ? "border-foreground bg-foreground text-background"
                        : stageOption.isCompleted
                          ? "border-emerald-600 bg-background text-foreground hover:border-emerald-500"
                          : stageOption.isUnlocked
                            ? "border-border bg-background text-foreground hover:border-foreground/40"
                            : "cursor-not-allowed border-border/60 bg-muted/40 text-muted-foreground"
                    }`}
                    disabled={isStageSelectionDisabled || !stageOption.isUnlocked}
                    key={stageOption.stage}
                    onClick={() => handleStageSelect(stageOption.stage)}
                    type="button"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {stageOption.isCompleted ? <CheckIcon className="size-3.5" /> : null}
                      {stageOption.label}
                    </span>
                  </button>
                ))}
              </div>

              {showGraduateAction ? (
                <div className="shrink-0">
                  <ConceptProjectGraduate
                    conceptProjectId={conceptProjectId}
                    projectId={projectId ?? null}
                  />
                </div>
              ) : null}
            </div>

            <div className="relative">
              <textarea
                className="min-h-32 w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground"
                onChange={(event) => onInputChange(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={
                  hasAnsweredOpeningPrompt
                    ? "Answer the current question or add more detail."
                    : "Keep the first answer concise."
                }
                value={input}
              />

              <Button
                disabled={!input.trim() || isSubmitting}
                type="submit"
                className="absolute right-2 bottom-4"
              >
                {isSubmitting ? (
                  "Thinking..."
                ) : (
                  <>
                    Send
                    <div className="flex">
                      <CommandIcon className="size-2.5" />{" "}
                      <CornerDownLeftIcon className="size-2.5" />
                    </div>
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                {!hasAnsweredOpeningPrompt ? (
                  <p
                    className={`text-xs ${
                      openingWordCount > 128 ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {openingWordCount}/128 words
                  </p>
                ) : null}
                {composerError ? (
                  <p className="text-xs text-destructive">{composerError}</p>
                ) : errorMessage ? (
                  <p className="text-xs text-destructive">{errorMessage}</p>
                ) : null}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
