"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type ProjectGenerateUbiquitousLanguageButtonProps = {
  projectId: string;
};

export function ProjectGenerateUbiquitousLanguageButton({
  projectId,
}: ProjectGenerateUbiquitousLanguageButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    setError(null);
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/project/${projectId}/ubiquitous-language`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Failed to generate ubiquitous language.");
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to generate ubiquitous language.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button disabled={isGenerating} onClick={handleGenerate} type="button">
        <Sparkles />
        {isGenerating ? "Generating..." : "Generate Ubiquitous Language"}
      </Button>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Generation failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
