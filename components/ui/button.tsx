"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import type { VariantProps } from "class-variance-authority";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";
import Link from "next/link";

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

function LinkButton({
  className,
  variant,
  size,
  ...props
}: PropsWithChildren<VariantProps<typeof buttonVariants> & ComponentPropsWithoutRef<typeof Link>>) {
  const { href, children, ...linkProps } = props;

  return (
    <Link href={href} className={cn(buttonVariants({ variant, size, className }))} {...linkProps}>
      {children}
    </Link>
  );
}

export { Button, buttonVariants, LinkButton };
