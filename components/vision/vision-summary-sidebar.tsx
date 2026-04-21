"use client";

import { PanelRightOpenIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MarkdownContent } from "@/components/ui/markdown-content";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

type VisionSummarySidebarProps = {
  summary: string;
};

export function VisionSummarySidebarTrigger() {
  const { isMobile, open, openMobile, setOpen, setOpenMobile } = useSidebar();
  const isOpen = isMobile ? openMobile : open;

  return (
    <Button
      aria-expanded={isOpen}
      onClick={() => (isMobile ? setOpenMobile(!openMobile) : setOpen(!open))}
      type="button"
      variant="outline"
    >
      <PanelRightOpenIcon data-icon="inline-start" />
      Summary
    </Button>
  );
}

export function VisionSummarySidebar({ summary }: VisionSummarySidebarProps) {
  const { isMobile, openMobile, setOpen, setOpenMobile } = useSidebar();
  const content = summary.trim();

  if (isMobile) {
    return (
      <Dialog onOpenChange={setOpenMobile} open={openMobile}>
        <DialogContent className="max-w-2xl!">
          <DialogHeader>
            <DialogTitle>Vision summary</DialogTitle>
            <DialogDescription>Hidden working summary for this vision chat.</DialogDescription>
          </DialogHeader>

          {content ? (
            <div className="max-h-[70dvh] overflow-y-auto rounded-lg border bg-background p-4">
              <MarkdownContent className="flex flex-col gap-4 text-sm" text={content} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No summary yet. Send a few messages and the vision agent will build one.
            </p>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sidebar className="z-30" side="right">
      <SidebarHeader className="gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sidebar-foreground">Vision summary</p>
            <p className="text-sm text-sidebar-foreground/70">
              Hidden working summary for this vision chat.
            </p>
          </div>

          <Button
            aria-label="Close summary sidebar"
            onClick={() => setOpen(false)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <XIcon />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Current summary</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-3">
            {content ? (
              <div className="rounded-lg border bg-background p-4">
                <MarkdownContent className="flex flex-col gap-4 text-sm" text={content} />
              </div>
            ) : (
              <p className="text-sm text-sidebar-foreground/70">
                No summary yet. Send a few messages and the vision agent will build one.
              </p>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
