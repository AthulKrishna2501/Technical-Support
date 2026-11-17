import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "admin_session";

function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL || "techsupport.admin@gmail.com";
}

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "admin!@#$%^";
}

function getSessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    `support-desk-${getAdminPassword()}-secret`
  );
}

function signToken(email: string): string {
  const hmac = crypto
    .createHmac("sha256", getSessionSecret())
    .update(email.toLowerCase())
    .digest("hex");
  return `${email.toLowerCase()}.${hmac}`;
}

export function verifyCredentials(email: string, password: string): boolean {
  const expectedEmail = getAdminEmail().trim().toLowerCase();
  const expectedPassword = getAdminPassword();
  return (
    email.trim().toLowerCase() === expectedEmail &&
    password === expectedPassword
  );
}

export function createSessionValue(email: string): string {
  return signToken(email);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;

  const expected = signToken(getAdminEmail());
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
