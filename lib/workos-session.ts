import { unsealData } from "iron-session";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

type WorkOSUser = {
  email?: string | null;
  firstName?: string | null;
  id: string;
  lastName?: string | null;
};

export type WorkOSSession = {
  accessToken: string;
  impersonator?: {
    email: string;
    reason: string | null;
  };
  refreshToken: string;
  user: WorkOSUser;
};

function getCookieName() {
  return process.env.WORKOS_COOKIE_NAME || "wos-session";
}

function getCookiePassword() {
  const password = process.env.WORKOS_COOKIE_PASSWORD;

  if (!password) {
    throw new Error("WORKOS_COOKIE_PASSWORD is required");
  }

  return password;
}

export async function getWorkOSSession(request?: NextRequest) {
  const cookieStore = request?.cookies ?? (await cookies());
  const sessionCookie = cookieStore.get(getCookieName());

  if (!sessionCookie) {
    return undefined;
  }

  return unsealData<WorkOSSession>(sessionCookie.value, {
    password: getCookiePassword(),
  });
}
