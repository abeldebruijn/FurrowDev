import { signOut, withAuth } from "@workos-inc/authkit-nextjs";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";

import { SiteHeader } from "@/components/ui/site-header";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function Home() {
  const { user } = await withAuth();

  if (!user) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto flex min-h-[calc(100vh-61px)] w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
          <section className="animate-fade-in-up space-y-3">
            <h1 className="font-heading text-5xl font-semibold tracking-tight text-foreground">
              Jouw dashboard
            </h1>
            <p className="max-w-3xl text-lg text-muted-foreground">
              Meld je aan om je beveiligde omgeving te openen, sessies te beheren en direct verder
              te gaan in je private werkruimte.
            </p>
          </section>

          <Card className="overflow-hidden rounded-lg border bg-card shadow-none">
            <CardHeader className="border-b pb-5">
              <CardTitle className="text-2xl">Welkom bij FurrowDev</CardTitle>
              <CardDescription className="max-w-2xl text-base leading-7">
                De interface volgt de rustige, redactionele stijl van `voortgangs`: veel witruimte,
                zachte randen, serif typografie en duidelijke acties.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-8 py-8 md:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-5">
                <div className="rounded-xl border bg-muted/35 p-5">
                  <p className="text-sm text-muted-foreground">Beveiligde toegang</p>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-foreground">
                    <li className="flex items-center gap-3">
                      <ShieldCheck className="size-4 text-muted-foreground" />
                      Hosted WorkOS sign-in en sign-up
                    </li>
                    <li className="flex items-center gap-3">
                      <LockKeyhole className="size-4 text-muted-foreground" />
                      Callback op `/auth/callback`
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="size-4 text-muted-foreground" />
                      instellingen
                    </li>
                  </ul>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/login"
                    className={buttonVariants({
                      size: "lg",
                      className: "rounded-lg",
                    })}
                  >
                    Aanmelden
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href="/sign-up"
                    className={buttonVariants({
                      variant: "outline",
                      size: "lg",
                      className: "rounded-lg",
                    })}
                  >
                    Account aanmaken
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border bg-background p-5">
                <p className="font-heading text-2xl font-semibold">Wat je krijgt</p>
                <Table className="mt-4">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Onderdeel</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Inloggen met WorkOS</TableCell>
                      <TableCell>Actief</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Server-side sessies</TableCell>
                      <TableCell>Actief</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Afgeschermde routes</TableCell>
                      <TableCell>Klaar</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="justify-between text-sm text-muted-foreground">
              <span>Open eerst een sessie om het dashboard te zien.</span>
              <span>Callback: `/auth/callback`</span>
            </CardFooter>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-61px)] w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
        <section className="animate-fade-in-up space-y-3">
          <h1 className="font-heading text-5xl font-semibold tracking-tight text-foreground">
            Jouw dashboard
          </h1>
          <p className="max-w-4xl text-lg text-muted-foreground">
            Start een nieuwe sessie, ga verder met je beveiligde omgeving of beheer je WorkOS
            aanmelding vanuit dezelfde rustige dashboardweergave.
          </p>
        </section>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl">Mijn omgeving</CardTitle>
              <CardDescription className="mt-1 text-base">
                Ingelogd als {user.email}. Kies waar je verder wilt.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Onderdeel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Beveiligde werkruimte</TableCell>
                  <TableCell>Beschikbaar</TableCell>
                  <TableCell>Privé route</TableCell>
                  <TableCell className="text-right">
                    <Link href="/settings">
                      <Button variant="outline" size="sm">
                        Settings
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Sessie</TableCell>
                  <TableCell>Actief</TableCell>
                  <TableCell>WorkOS</TableCell>
                  <TableCell className="text-right">
                    <form
                      action={async () => {
                        "use server";
                        await signOut();
                      }}
                    >
                      <Button type="submit" variant="outline" size="sm">
                        Afmelden
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Profiel</TableCell>
                  <TableCell>{user.firstName ? "Persoonlijk" : "Basis"}</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href="/settings"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Bekijken
                    </Link>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="justify-between text-sm text-muted-foreground">
            <span>{user.id}</span>
            <span>Pagina 1 van 1</span>
          </CardFooter>
        </Card>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-2xl">Accountgegevens</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>Waarde</TableHead>
                  <TableHead className="text-right">Actie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">E-mail</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href="/settings"
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      Beheer
                    </Link>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
