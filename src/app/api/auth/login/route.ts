import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  createSessionValue,
  credentialsMatch,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "");
    const password = String(body?.password || "");

    if (!credentialsMatch(email, password)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: AUTH_COOKIE,
      value: await createSessionValue(normalizedEmail),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
