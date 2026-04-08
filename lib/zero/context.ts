import { randomUUID } from "node:crypto";

import { getTokenClaims } from "@workos-inc/authkit-nextjs";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { users } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { getWorkOSUserDisplayName } from "@/lib/zero/user-display-name";
import { getWorkOSSession } from "@/lib/workos-session";

export type ZeroContext = {
  viewerId: string;
  workosUserId: string;
  orgId?: string;
  role?: string;
  roles: string[];
  permissions: string[];
};

type TokenClaims = {
  org_id?: unknown;
  role?: unknown;
  roles?: unknown;
  permissions?: unknown;
};

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

export async function getZeroContext(request: NextRequest): Promise<ZeroContext | null> {
  const session = await getWorkOSSession(request);

  if (!session) {
    return null;
  }

  const db = getDb();
  const name = getWorkOSUserDisplayName(session.user);
  const [viewer] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      workosUserId: session.user.id,
      name,
    })
    .onConflictDoUpdate({
      target: users.workosUserId,
      set: {
        name,
      },
    })
    .returning({
      id: users.id,
      workosUserId: users.workosUserId,
    });

  const claims = await getTokenClaims<TokenClaims>(session.accessToken);

  return {
    viewerId: viewer.id,
    workosUserId: viewer.workosUserId,
    orgId: typeof claims.org_id === "string" ? claims.org_id : undefined,
    role: typeof claims.role === "string" ? claims.role : undefined,
    roles: getStringArray(claims.roles),
    permissions: getStringArray(claims.permissions),
  };
}

export async function getViewerRecord(viewerId: string) {
  const db = getDb();
  const [viewer] = await db.select().from(users).where(eq(users.id, viewerId)).limit(1);

  return viewer ?? null;
}
