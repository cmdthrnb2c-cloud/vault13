import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSession,
  hasAdminSession,
  isAdminAuthConfigured,
  isAdminPasswordValid,
} from "@/lib/admin-auth";

export async function GET() {
  if (!(await hasAdminSession())) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { authenticated: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      { authenticated: false, error: "Admin authentication is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return NextResponse.json(
      { authenticated: false, error: "Invalid request." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!isAdminPasswordValid(password)) {
    return NextResponse.json(
      { authenticated: false, error: "Нууц үг буруу байна." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const session = createAdminSession();
  const response = NextResponse.json(
    { authenticated: true },
    { headers: { "Cache-Control": "no-store" } }
  );
  response.cookies.set(ADMIN_SESSION_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: session.maxAge,
  });

  return response;
}