import { randomUUID } from "node:crypto";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { eq } from "drizzle-orm";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { NextRequest } from "next/server";

import { users } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { getWorkOSSession } from "@/lib/workos-session";
import { getWorkOSUserDisplayName } from "@/lib/zero/user-display-name";
import type { WorkOSSession } from "@/lib/workos-session";

export type ZeroContext = {
  viewerId: string;
  workosUserId: string;
  orgId?: string;
  role?: string;
  roles: string[];
  permissions: string[];
};

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

type WorkOSUserLike = Pick<WorkOSSession["user"], "email" | "firstName" | "id" | "lastName">;
type WorkOSAccessTokenClaims = JWTPayload & {
  email?: unknown;
  first_name?: unknown;
  given_name?: unknown;
  last_name?: unknown;
  org_id?: unknown;
  permissions?: unknown;
  role?: unknown;
  roles?: unknown;
  sid?: unknown;
  sub?: unknown;
};

const workOSJWKS = createRemoteJWKSet(
  new URL(
    `${process.env.WORKOS_API_HTTPS === "false" ? "http" : "https"}://${process.env.WORKOS_API_HOSTNAME || "api.workos.com"}${process.env.WORKOS_API_PORT ? `:${process.env.WORKOS_API_PORT}` : ""}/sso/jwks/${process.env.WORKOS_CLIENT_ID}`,
  ),
);

export async function upsertViewerFromWorkOSUser(user: WorkOSUserLike) {
  const db = getDb();
  const name = getWorkOSUserDisplayName(user);

  const [viewer] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      workosUserId: user.id,
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

  return viewer;
}

export async function upsertViewerFromWorkOSSession(session: WorkOSSession) {
  return upsertViewerFromWorkOSUser(session.user);
}

async function getViewerByWorkOSUserId(workosUserId: string) {
  const db = getDb();
  const [viewer] = await db
    .select({
      id: users.id,
      workosUserId: users.workosUserId,
    })
    .from(users)
    .where(eq(users.workosUserId, workosUserId))
    .limit(1);

  return viewer ?? null;
}

function getAuthTokenFromRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  return match?.[1];
}

async function verifyWorkOSAccessToken(accessToken: string) {
  const { payload } = await jwtVerify<WorkOSAccessTokenClaims>(accessToken, workOSJWKS);

  return payload;
}

async function getViewerFromAccessTokenClaims(claims: WorkOSAccessTokenClaims) {
  if (typeof claims.sub !== "string") {
    return null;
  }

  const existingViewer = await getViewerByWorkOSUserId(claims.sub);

  if (existingViewer) {
    return existingViewer;
  }

  return upsertViewerFromWorkOSUser({
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    firstName:
      typeof claims.given_name === "string"
        ? claims.given_name
        : typeof claims.first_name === "string"
          ? claims.first_name
          : null,
    lastName: typeof claims.last_name === "string" ? claims.last_name : null,
  });
}

function buildZeroContext(
  viewer: {
    id: string;
    workosUserId: string;
  },
  claims: Pick<WorkOSAccessTokenClaims, "org_id" | "permissions" | "role" | "roles">,
): ZeroContext {
  return {
    viewerId: viewer.id,
    workosUserId: viewer.workosUserId,
    orgId: typeof claims.org_id === "string" ? claims.org_id : undefined,
    role: typeof claims.role === "string" ? claims.role : undefined,
    roles: getStringArray(claims.roles),
    permissions: getStringArray(claims.permissions),
  };
}

export async function getZeroContext(request?: NextRequest): Promise<ZeroContext | null> {
  if (request) {
    const authToken = getAuthTokenFromRequest(request);

    if (authToken) {
      try {
        const claims = await verifyWorkOSAccessToken(authToken);
        const viewer = await getViewerFromAccessTokenClaims(claims);

        return viewer ? buildZeroContext(viewer, claims) : null;
      } catch {
        return null;
      }
    }

    const session = await getWorkOSSession(request);

    if (!session?.accessToken) {
      return null;
    }

    try {
      const claims = await verifyWorkOSAccessToken(session.accessToken);
      const viewer = await upsertViewerFromWorkOSUser(session.user);

      return buildZeroContext(viewer, claims);
    } catch {
      return null;
    }
  }

  const auth = await withAuth();

  if (!auth.user || !auth.accessToken) {
    return null;
  }

  const viewer = await upsertViewerFromWorkOSUser(auth.user);
  return buildZeroContext(viewer, {
    org_id: auth.organizationId,
    role: auth.role,
    roles: auth.roles,
    permissions: auth.permissions,
  });
}

export async function getViewerRecord(viewerId: string) {
  const db = getDb();
  const [viewer] = await db.select().from(users).where(eq(users.id, viewerId)).limit(1);

  return viewer ?? null;
}
