import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { verifyPassword } from "./password";
import {
  getUserByEmail,
  getUserBySessionToken,
  createSession,
  deleteSession,
  updateUser,
  type UserRow,
} from "./repo";

export type UserRole = "admin" | "user";
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  user: "พนักงาน",
};

const SESSION_COOKIE = "hotel_session";
const SESSION_DAYS = 30;

function toAuthUser(u: UserRow): AuthUser {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  };
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const user = await getUserBySessionToken(token);
  return user ? toAuthUser(user) : null;
}

export async function login(
  email: string,
  password: string
): Promise<{ user: AuthUser; token: string } | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;
  if (!verifyPassword(password, user.password_hash)) return null;
  const token = randomBytes(32).toString("hex");
  await createSession(token, user.id, addDays(SESSION_DAYS));
  return { user: toAuthUser(user), token };
}

export async function logout() {
  const token = await getSessionToken();
  if (token) await deleteSession(token);
}

export async function requireAdmin(): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  return user && user.role === "admin" ? user : null;
}

export async function updateUserName(id: number, name: string) {
  await updateUser(id, { name });
}
