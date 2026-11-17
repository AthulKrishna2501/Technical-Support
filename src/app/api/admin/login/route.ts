import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  createSessionValue,
  verifyCredentials,
} from "@/lib/adminAuth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "");
    const password = String(body?.password || "");

    if (!verifyCredentials(email, password)) {
      return NextResponse.json(
        { ok: false, error: "Invalid admin email or password." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, createSessionValue(email), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 }
    );
  }
}
