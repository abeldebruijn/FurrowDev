"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";

type ProjectHeaderBackButtonProps = {
  projectId: string;
};

export function ProjectHeaderBackButton({ projectId }: ProjectHeaderBackButtonProps) {
  const pathname = usePathname();
  const projectHref = `/project/${projectId}`;
  const backHref = pathname === projectHref ? "/" : projectHref;

  return (
    <Link
      href={backHref}
      className={buttonVariants({
        variant: "outline",
        size: "icon",
      })}
      aria-label="Go back"
    >
      <ChevronLeft />
    </Link>
  );
}
