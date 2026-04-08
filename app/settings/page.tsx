import Link from "next/link";
import { signOut, withAuth } from "@workos-inc/authkit-nextjs";

import { SiteHeader } from "@/components/ui/site-header";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ProtectedPage() {
  const { user } = await withAuth({ ensureSignedIn: true });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-61px)] w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
        <section className="space-y-3">
          <h1 className="font-heading text-5xl font-semibold tracking-tight text-foreground">
            Beschermde werkruimte
          </h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            Deze pagina is alleen zichtbaar met een geldige WorkOS sessie.
          </p>
        </section>

        <Card className="rounded-lg border bg-card shadow-none">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-2xl">Sessie-overzicht</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Veld</TableHead>
                  <TableHead>Waarde</TableHead>
                  <TableHead className="text-right">Actie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">E-mail</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="text-right">
                    <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
                      Terug
                    </Link>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Gebruiker ID</TableCell>
                  <TableCell>{user.id}</TableCell>
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
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
