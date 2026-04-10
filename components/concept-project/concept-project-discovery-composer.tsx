"use client";

import { ArrowDownIcon, ChevronDownIcon, CommandIcon, CornerDownLeftIcon } from "lucide-react";

import { ConceptProjectPostSetupActions } from "@/components/concept-project/concept-project-post-setup-actions";
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

        <form onSubmit={handleSubmit} ref={composerFormRef}>
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex min-w-0 flex-1 sm:flex-none sm:min-w-52">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      className="w-full justify-between sm:w-auto sm:min-w-52"
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

            {showGraduateAction ? (
              <div className="shrink-0">
                <ConceptProjectPostSetupActions
                  conceptProjectId={conceptProjectId}
                  currentStage={currentStage}
                  disabled={isSubmitting || isSwitchingStage}
                  projectId={projectId ?? null}
                />
              </div>
            ) : null}
          </div>

          <div className="relative bg-background rounded-lg">
            <textarea
              className="min-h-32 w-full rounded-lg border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground"
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
                    <CommandIcon className="size-2.5" /> <CornerDownLeftIcon className="size-2.5" />
                  </div>
                </>
              )}
            </Button>
          </div>

          {(!hasAnsweredOpeningPrompt || composerError || errorMessage) && (
            <div className="flex items-center justify-between gap-3 bg-background p-2">
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
          )}
        </form>
      </div>
    </div>
  );
}
