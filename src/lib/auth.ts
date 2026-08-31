import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  isValidPassword as comparePassword,
  isValidSessionToken,
} from "@/lib/session";

export { SESSION_COOKIE };

function getSecret() {
  return process.env.AUTH_SECRET ?? "";
}

export async function setSessionCookie() {
  const secret = getSecret();
  if (!secret) throw new Error("AUTH_SECRET is not set");
  const token = await createSessionToken(secret);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function isAdminLoggedIn() {
  const store = await cookies();
  return isValidSessionToken(store.get(SESSION_COOKIE)?.value, getSecret());
}

export async function requireAdmin() {
  if (!(await isAdminLoggedIn())) {
    redirect("/admin/login");
  }
}

export function isValidPassword(password: string) {
  return comparePassword(password, process.env.ADMIN_PASSWORD ?? "");
}
