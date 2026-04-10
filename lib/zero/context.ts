import { randomUUID } from "node:crypto";

import { getTokenClaims } from "@workos-inc/authkit-nextjs";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { users } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { getWorkOSUserDisplayName } from "@/lib/zero/user-display-name";
import { getWorkOSSession, type WorkOSSession } from "@/lib/workos-session";

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

type PostgresErrorLike = {
  code?: string;
};

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function isUniqueViolation(error: unknown): error is PostgresErrorLike {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export async function upsertViewerFromWorkOSSession(session: WorkOSSession) {
  const db = getDb();
  const name = getWorkOSUserDisplayName(session.user);
  const [existingViewer] = await db
    .select({
      id: users.id,
      workosUserId: users.workosUserId,
      name: users.name,
    })
    .from(users)
    .where(eq(users.workosUserId, session.user.id))
    .limit(1);

  if (existingViewer) {
    if (existingViewer.name !== name) {
      await db.update(users).set({ name }).where(eq(users.id, existingViewer.id));
    }

    return {
      id: existingViewer.id,
      workosUserId: existingViewer.workosUserId,
    };
  }

  const [viewer] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      workosUserId: session.user.id,
      name,
    })
    .returning({
      id: users.id,
      workosUserId: users.workosUserId,
    })
    .catch(async (error: unknown) => {
      if (!isUniqueViolation(error)) {
        throw error;
      }

      const [concurrentViewer] = await db
        .select({
          id: users.id,
          workosUserId: users.workosUserId,
          name: users.name,
        })
        .from(users)
        .where(eq(users.workosUserId, session.user.id))
        .limit(1);

      if (!concurrentViewer) {
        throw error;
      }

      if (concurrentViewer.name !== name) {
        await db.update(users).set({ name }).where(eq(users.id, concurrentViewer.id));
      }

      return [
        {
          id: concurrentViewer.id,
          workosUserId: concurrentViewer.workosUserId,
        },
      ];
    });

  return viewer;
}

export async function getZeroContext(request: NextRequest): Promise<ZeroContext | null> {
  const session = await getWorkOSSession(request);

  if (!session) {
    return null;
  }

  const viewer = await upsertViewerFromWorkOSSession(session);

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
