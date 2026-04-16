"use client";

import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";

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

import type { VisionWorkspaceProps } from "./vision-workspace-types";

type VisionCollaboratorsDialogProps = {
  canManage: boolean;
  collaborators: VisionWorkspaceProps["initialCollaborators"];
  eligibleCollaborators: VisionWorkspaceProps["eligibleCollaborators"];
  onAdd: (userId: string) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
  ownerName: string;
  ownerUserId: string;
};

export function VisionCollaboratorsDialog({
  canManage,
  collaborators,
  eligibleCollaborators,
  onAdd,
  onRemove,
  ownerName,
  ownerUserId,
}: VisionCollaboratorsDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const collaboratorIds = useMemo(
    () => new Set(collaborators.map((collaborator) => collaborator.userId)),
    [collaborators],
  );

  const availableUsers = eligibleCollaborators.filter(
    (user) =>
      user.id !== ownerUserId &&
      !collaboratorIds.has(user.id) &&
      user.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedUserId("");
      setError(null);
      setIsSaving(false);
    }
  }, [open]);

  async function handleAdd() {
    if (!selectedUserId) {
      setError("Choose a user to add.");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await onAdd(selectedUserId);
      setSelectedUserId("");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to add collaborator.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(userId: string) {
    setError(null);
    setIsSaving(true);

    try {
      await onRemove(userId);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to remove collaborator.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <Users />
        Collaborators
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vision collaborators</DialogTitle>
          <DialogDescription>
            This vision is private. Only the owner and explicitly added collaborators can view it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Owner</p>
            <div className="rounded-xl border bg-muted/40 px-3 py-2 text-sm text-foreground">
              {ownerName}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Current collaborators</p>
            {collaborators.length === 0 ? (
              <p className="text-sm text-muted-foreground">No collaborators added yet.</p>
            ) : (
              <div className="space-y-2">
                {collaborators.map((collaborator) => (
                  <div
                    className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
                    key={collaborator.userId}
                  >
                    <span>{collaborator.name}</span>
                    {canManage ? (
                      <Button
                        disabled={isSaving}
                        onClick={() => void handleRemove(collaborator.userId)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {canManage ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Invite collaborator</p>
              <input
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter eligible users"
                value={query}
              />
              <select
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                onChange={(event) => setSelectedUserId(event.target.value)}
                value={selectedUserId}
              >
                <option value="">Choose a user</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Only existing users with current project access are eligible.
              </p>
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Collaborator update failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        {canManage ? (
          <DialogFooter>
            <Button disabled={isSaving} onClick={handleAdd} type="button">
              {isSaving ? "Saving..." : "Add collaborator"}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
