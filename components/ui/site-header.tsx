import Link from "next/link";
import { withAuth } from "@workos-inc/authkit-nextjs";

import { buttonVariants } from "@/components/ui/button-variants";

function getInitials(email: string, firstName?: string | null) {
  if (firstName?.trim()) {
    return firstName.trim().slice(0, 1).toUpperCase();
  }

  return email.slice(0, 1).toUpperCase();
}

export async function SiteHeader({ title = "FurrowDev" }: { title?: string }) {
  const { user } = await withAuth();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="font-heading text-[2rem] font-semibold tracking-tight text-foreground"
        >
          {title}
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className={buttonVariants({
                variant: "ghost",
                size: "sm",
                className: "hidden sm:inline-flex",
              })}
            >
              Dashboard
            </Link>
            <Link
              href="/settings"
              className="flex size-8 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#b287ff,#7c3aed_60%,#5b21b6)] font-sans text-sm font-semibold text-white shadow-sm"
            >
              {getInitials(user.email, user.firstName)}
            </Link>
          </div>
        ) : (
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Aanmelden
          </Link>
        )}
      </div>
    </header>
  );
}
