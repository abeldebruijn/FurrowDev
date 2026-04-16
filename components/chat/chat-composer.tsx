"use client";

import type { FormEventHandler, KeyboardEventHandler, ReactNode, RefObject } from "react";
import { ArrowDownIcon, CommandIcon, CornerDownLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type ChatComposerProps = {
  composerFormRef: RefObject<HTMLFormElement | null>;
  composerShellRef: RefObject<HTMLDivElement | null>;
  footer?: ReactNode;
  header?: ReactNode;
  helperContent?: ReactNode;
  input: string;
  inputId: string;
  inputLabel: string;
  isAtBottom: boolean;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onInputChange: (value: string) => void;
  onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  onScrollToBottom: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  placeholder: string;
  submitLabel?: string;
  submittingLabel?: string;
};

export function ChatComposer({
  composerFormRef,
  composerShellRef,
  footer,
  header,
  helperContent,
  input,
  inputId,
  inputLabel,
  isAtBottom,
  isSubmitDisabled,
  isSubmitting,
  onInputChange,
  onKeyDown,
  onScrollToBottom,
  onSubmit,
  placeholder,
  submitLabel = "Send",
  submittingLabel = "Thinking...",
}: ChatComposerProps) {
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

        <form onSubmit={onSubmit} ref={composerFormRef}>
          {header ? <div className="mb-2">{header}</div> : null}

          <div className="relative rounded-lg bg-background">
            <label className="sr-only" htmlFor={inputId}>
              {inputLabel}
            </label>
            <textarea
              aria-label={inputLabel}
              className="min-h-32 w-full rounded-lg border bg-background px-4 py-3 text-sm outline-none transition focus:border-foreground"
              id={inputId}
              onChange={(event) => onInputChange(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              value={input}
            />

            <Button className="absolute right-2 bottom-4" disabled={isSubmitDisabled} type="submit">
              {isSubmitting ? (
                submittingLabel
              ) : (
                <>
                  {submitLabel}
                  <div className="flex">
                    <CommandIcon className="size-2.5" />
                    <CornerDownLeftIcon className="size-2.5" />
                  </div>
                </>
              )}
            </Button>
          </div>

          {helperContent ? (
            <div className="flex items-center justify-between gap-3 bg-background p-2">
              {helperContent}
            </div>
          ) : null}

          {footer ? <div className="mt-2">{footer}</div> : null}
        </form>
      </div>
    </div>
  );
}
